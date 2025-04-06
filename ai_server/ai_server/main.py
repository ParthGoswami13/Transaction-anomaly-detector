import json
import re
import pandas as pd
from flask import Flask, request, jsonify
from langchain_groq import ChatGroq
from langchain.schema import SystemMessage, HumanMessage
from dotenv import load_dotenv
import os
import base64
from flask_cors import CORS
import joblib
from datetime import datetime
from geopy.distance import geodesic
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from imblearn.over_sampling import SMOTE
from imblearn.pipeline import Pipeline as ImbPipeline
import networkx as nx
import numpy as np
from typing import Dict, List, Optional
from datetime import datetime, timedelta 

# Load environment variables
load_dotenv()

# Initialize Flask app
app = Flask(__name__)
CORS(app)

# ==================================================================
# SMURFING DETECTION CONFIGURATION
# ==================================================================
STRUCTURING_PARAMS = {
    'min_split': 2,
    'max_time_window': 12,
    'amount_variation': 3,
    'min_total_amount': 3000
}


# ==================================================================
# SMURFING DETECTOR CLASS
# ==================================================================
SMURFING_PARAMS = {
    'min_transactions': 3,
    'max_amount': 10000,
    'max_time_window': 24,
    'min_senders': 2,
    'amount_variation': 1.5,
    'min_total_amount': 5000,
    'structuring_threshold': 0.7,
    'high_risk_merchants': ['electronics', 'jewelry', 'crypto']
}

class SmurfingDetector:
    def __init__(self, csv_file_path: str, json_file_path: Optional[str] = None):
        self.csv_file_path = csv_file_path
        self.json_file_path = json_file_path
        self.df = None
        self.graph = None
        self.community_data = None
        self._initialize()

    def _initialize(self):
        """Load data and build initial graph"""
        try:
            self.df = self._load_transaction_data()
            if self.df is not None:
                print("✅ Data loaded successfully")
                self.graph = self._build_transaction_graph()
                self.community_data = self._load_community_data()
        except Exception as e:
            print(f"🚨 Initialization failed: {str(e)}")


    def _load_transaction_data(self) -> Optional[pd.DataFrame]:
        """Handle the CSV structure with enhanced validation"""
        try:
            # Read with explicit dtype for problematic columns
            dtype_spec = {
                'cc_num': 'str',
                'cardNum': 'str',
                'amt': 'float32',
                'amount': 'float32',
                'trans_num': 'str',
                'transactionId': 'str'
            }
            
            df = pd.read_csv(
                self.csv_file_path,
                dtype=dtype_spec,
                parse_dates=['trans_date_trans_time'],
                infer_datetime_format=True,
                low_memory=False
            )
            print(f"✅ Loaded {len(df)} transactions")

            # Column mapping with fallbacks
            processed_df = pd.DataFrame({
                'Sender_account': df.get('cc_num', df.get('cardNum')),
                'Receiver_account': df.get('merchant'),
                'Amount': df.get('amt', df.get('amount')),
                'Transaction_ID': df.get('trans_num', df.get('transactionId')),
                'DateTime': df.get('trans_date_trans_time'),
                'Sender_bank_location': df.get('state', 'unknown'),
                'Receiver_bank_location_lat': df.get('merch_lat', 0.0),
                'Payment_type': df.get('category', 'unknown')
            })

            # Type conversion and validation
            processed_df['Amount'] = pd.to_numeric(processed_df['Amount'], errors='coerce').fillna(0)
            processed_df['DateTime'] = pd.to_datetime(processed_df['DateTime'], errors='coerce')
            
            # Calculate time features
            processed_df.sort_values(by=['Sender_account', 'DateTime'], inplace=True)
            processed_df['TimeSinceLastTx'] = (
                processed_df.groupby('Sender_account')['DateTime']
                .diff()
                .dt.total_seconds()
                .fillna(0)
            )
            
            # Add merchant risk flag
            processed_df['HighRiskMerchant'] = processed_df['Receiver_account'].str.lower().str.contains(
                '|'.join(SMURFING_PARAMS['high_risk_merchants'])
            ).astype(int)

            return processed_df.dropna(subset=['Sender_account', 'Receiver_account', 'Amount'])

        except Exception as e:
            print(f"🚨 Data loading failed: {str(e)}")
            return None

    def _build_transaction_graph(self) -> nx.DiGraph:
        """Build transaction graph with amount and temporal patterns"""
        G = nx.DiGraph()
        
        for _, row in self.df.iterrows():
            try:
                sender = str(row['Sender_account'])
                receiver = str(row['Receiver_account'])
                
                G.add_node(sender, type='account', 
                          bank=row.get('Sender_bank_location', 'unknown'))
                G.add_node(receiver, type='merchant', 
                          risk=row.get('HighRiskMerchant', 0))
                
                G.add_edge(sender, receiver,
                          amount=float(row['Amount']),
                          timestamp=row['DateTime'],
                          time_diff=float(row['TimeSinceLastTx']),
                          payment_type=row.get('Payment_type', 'unknown'))
            except Exception as e:
                continue
                
        print(f"✅ Built graph with {G.number_of_nodes()} nodes and {G.number_of_edges()} edges")
        return G

    def detect_smurfing_enhanced(self, transaction: Dict) -> List[Dict]:
        """Enhanced detection with columns matching your CSV"""
        # Required fields based on your CSV columns
        required_fields = ['Amount']
        missing_fields = [field for field in required_fields if field not in transaction]
        
        if missing_fields:
            return self._error_response(f"Missing required fields: {missing_fields}")

        try:
            # Convert to proper types
            # trans_time = pd.to_datetime(transaction['trans_date_trans_time'])
            amount = float(transaction['Amount'])
            # card_num = str(transaction['cardNum'])
            # merchant = str(transaction['merchant'])

            # Store original data
            original_df = self.df.copy() if self.df is not None else None
            
            try:
                # Create new transaction record matching CSV structure
                new_txn = pd.DataFrame([{
                    # 'trans_date_trans_time': trans_time,
                    # 'cardNum': card_num,
                    # 'merchant': merchant,
                    'Amount': amount,
                    # Include optional fields if available
                    'category': transaction.get('category', 'unknown'),
                    'transactionId': transaction.get('transactionId', ''),
                    'merch_lat': float(transaction.get('merch_lat', 0)),
                    'merch_long': float(transaction.get('merch_long', 0))
                }])

                # Temporarily add to dataset
                self.df = pd.concat([original_df, new_txn], ignore_index=True) if original_df is not None else new_txn

                # Run analyses (rest of your existing code)
                community_results = self.detect_smurfing()
                behavioral_results = self._detect_behavioral_patterns(
                    # sender=card_num,
                    amount=amount,
                    # transaction_time=trans_time
                )

                return [{
                    **comm,
                    **behavioral_results,
                    "enhanced_suspicion_score": min(1.0, 
                        comm.get('suspicion_score', 0) + 
                        behavioral_results.get('behavioral_score', 0)),
                    # "transaction_time": trans_time.isoformat()
                } for comm in community_results]

            except Exception as e:
                return self._error_response(f"Analysis failed: {str(e)}")
            finally:
                # Restore original data
                self.df = original_df

        except Exception as e:
            return self._error_response(f"Invalid data: {str(e)}")

    def _error_response(self, message: str) -> List[Dict]:
        """Standardized error response"""
        return [{
            "error": message,
            "system": "smurfing_detection",
            "timestamp": datetime.now().isoformat()
        }]

    def _error_response(self, message: str) -> List[Dict]:
        """Standard error response format"""
        return [{
            "error": message,
            "system": "smurfing_detection",
            "timestamp": datetime.now().isoformat()
        }]
    
    def _detect_behavioral_patterns(self, sender: str, amount: float, transaction_time: pd.Timestamp) -> Dict:
        """Detect behavioral patterns with robust error handling"""
        patterns = {
            "behavioral_score": 0.0,
            "amount_flags": [],
            "temporal_flags": [],
            "merchant_flags": [],
            "amount_analysis": {},
            "temporal_analysis": {}
        }

        try:
            if self.df is None or sender not in self.df['Sender_account'].values:
                return patterns

            # Get sender's history (last 30 days)
            history = self.df[
                (self.df['Sender_account'] == sender) &
                (self.df['DateTime'] < transaction_time) &
                (self.df['DateTime'] >= transaction_time - timedelta(days=30))
            ]

            # Amount structuring detection
            for min_amt, max_amt in [(900,1000), (4500,5000), (9000,10000)]:
                if min_amt <= amount <= max_amt:
                    similar = history[
                        (history['Amount'] >= min_amt) & 
                        (history['Amount'] <= max_amt)
                    ]
                    if len(similar) > 0:
                        patterns['amount_flags'].append(f"amount_{min_amt}-{max_amt}")
                        patterns['behavioral_score'] += 0.25
                        patterns['amount_analysis'][f"range_{min_amt}-{max_amt}"] = {
                            "count": len(similar),
                            "total": similar['Amount'].sum()
                        }

            # Temporal patterns
            if transaction_time.hour in range(0, 6):  # 12am-6am
                patterns['temporal_flags'].append("late_night")
                patterns['behavioral_score'] += 0.2

            recent = history[history['DateTime'] >= transaction_time - timedelta(hours=1)]
            if len(recent) >= 3:
                patterns['temporal_flags'].append(f"rapid_{len(recent)}_txns")
                patterns['behavioral_score'] += 0.1 * len(recent)
                patterns['temporal_analysis']['last_hour'] = len(recent)

            # Merchant patterns
            merchant_counts = history['Receiver_account'].value_counts()
            if len(merchant_counts) > 0:
                if merchant_counts.iloc[0]/len(history) > 0.7:
                    patterns['merchant_flags'].append(
                        f"concentrated_{merchant_counts.index[0]}")
                    patterns['behavioral_score'] += 0.2
                
                if any(x in merchant_counts.index[0].lower() 
                      for x in ['electronics', 'jewelry', 'crypto']):
                    patterns['merchant_flags'].append("high_risk_merchant")
                    patterns['behavioral_score'] += 0.3

        except Exception as e:
            print(f"Behavioral analysis failed: {str(e)}")
        
        return patterns


    def _load_community_data(self) -> Dict:
        """Load fraud community data"""
        if self.json_file_path and os.path.exists(self.json_file_path):
            with open(self.json_file_path, 'r') as f:
                return json.load(f)
        print("⚠ No community JSON found, using mock data")
        return {
            "fraud_communities": {
                "1": {
                    "Members": list(set(
                        self.df['Sender_account'].dropna().astype(str).tolist() + 
                        self.df['Receiver_account'].dropna().astype(str).tolist()
                    ))[:20]
                }
            }
        }

    def detect_smurfing(self) -> List[Dict]:
        """Run smurfing detection analysis"""
        if self.graph is None or self.df is None:
            return []
        
        results = []
        for comm_id, comm_data in self.community_data.get('fraud_communities', {}).items():
            members = [str(m) for m in comm_data.get('Members', [])]
            comm_df = self.df[
                (self.df['Sender_account'].astype(str).isin(members)) | 
                (self.df['Receiver_account'].astype(str).isin(members))
            ]
            
            smurfing = self._detect_smurfing_patterns(comm_df, members)
            structuring = self._detect_structuring_patterns(comm_df, members)
            
            results.append({
                "community_id": comm_id,
                "smurfing_cases": smurfing,
                "structuring_cases": structuring,
                "member_count": len(members),
                "transaction_count": len(comm_df)
            })
        
        return results

    def _detect_smurfing_patterns(self, df: pd.DataFrame, members: List[str]) -> List[Dict]:
        smurfing_cases = []
        
        # Pattern 1: Multiple small-medium transactions to same receiver
        receiver_groups = df.groupby('Receiver_account')
        for receiver, group in receiver_groups:
            if len(group) >= SMURFING_PARAMS['min_transactions']:
                amounts = group['Amount'].values
                time_window = (group['DateTime'].max() - group['DateTime'].min()).total_seconds()/3600
                
                if (all(a < SMURFING_PARAMS['max_amount'] for a in amounts) and \
                   (time_window < SMURFING_PARAMS['max_time_window']) and \
                   (len(group['Sender_account'].unique()) >= SMURFING_PARAMS['min_senders'])):
                    
                    case = {
                        "pattern_type": "Classic_Smurfing",
                        "receiver": str(receiver),
                        "transaction_count": len(group),
                        "total_amount": sum(amounts),
                        "time_window_hours": round(time_window, 2),
                        "average_amount": round(np.mean(amounts), 2),
                        "senders": [str(s) for s in group['Sender_account'].unique()],
                        "first_transaction": group['DateTime'].min().strftime("%Y-%m-%d %H:%M"),
                        "last_transaction": group['DateTime'].max().strftime("%Y-%m-%d %H:%M"),
                        "suspicion_score": min(100, round((sum(amounts)/SMURFING_PARAMS['max_amount'])*100))
                    }
                    smurfing_cases.append(case)
        
        return smurfing_cases

    def _detect_structuring_patterns(self, df: pd.DataFrame, members: List[str]) -> List[Dict]:
        structuring_cases = []
        
        for node in members:
            try:
                successors = list(self.graph.successors(node))
                if len(successors) >= STRUCTURING_PARAMS['min_split']:
                    edges = [self.graph[node][s] for s in successors]
                    amounts = [e['amount'] for e in edges]
                    times = [e['timestamp'] for e in edges]
                    time_window = (max(times) - min(times)).total_seconds()/3600
                    
                    if (time_window < STRUCTURING_PARAMS['max_time_window']) and \
                       (max(amounts)/min(amounts) < STRUCTURING_PARAMS['amount_variation']) and \
                       (sum(amounts) > STRUCTURING_PARAMS['min_total_amount']):
                        
                        case = {
                            "pattern_type": "Transaction_Splitting",
                            "main_account": str(node),
                            "split_count": len(successors),
                            "total_amount": sum(amounts),
                            "time_window_hours": round(time_window, 2),
                            "amount_range": f"{min(amounts):.2f}-{max(amounts):.2f}",
                            "destination_accounts": [str(s) for s in successors],
                            "suspicion_score": min(100, round((sum(amounts)/STRUCTURING_PARAMS['min_total_amount'])*20))
                        }
                        structuring_cases.append(case)
            except:
                continue
        
        return structuring_cases

# ==================================================================
# FRAUD DETECTION SYSTEM
# ==================================================================
class PersistentAutoRetrainFraudDetector:
    
    def __init__(self, model_path='fraud_detection_model.pkl', 
                 training_data_path='hackathon_ai_dataset.csv',
                 state_path='fraud_detector_state.json'):
        """Initialize with persistent counter"""
        # Convert to absolute paths
        self.model_path = os.path.abspath(model_path)
        self.training_data_path = os.path.abspath(training_data_path)
        self.state_path = os.path.abspath(state_path)
        
        self.retrain_interval = 3
        self.original_df = pd.DataFrame(pd.read_csv(self.training_data_path))
        
        print(f"State file will be saved to: {self.state_path}")
        print(f"Current working directory: {os.getcwd()}")
        
        # Load or initialize state
        self._load_state()
        
        # Load or create model
        if os.path.exists(self.model_path):
            self.model = joblib.load(self.model_path)
            print("✅ Loaded existing model")
        else:
            self.model = self._train_new_model()
            
        self._validate_and_repair_file()
        print(f"✅ System initialized with auto-retraining every {self.retrain_interval} entries")
        print(f"ℹ️ Current entry count: {self.new_entry_count}/{self.retrain_interval}")

    def _load_state(self):
        """Load persistent state from file"""
        try:
            # Create directory if it doesn't exist
            os.makedirs(os.path.dirname(self.state_path), exist_ok=True)
            
            if os.path.exists(self.state_path):
                with open(self.state_path, 'r') as f:
                    state = json.load(f)
                    self.new_entry_count = state.get('new_entry_count', 0)
                    print(f"Loaded state: {state}")
            else:
                self.new_entry_count = 0
                # Initialize file with default values
                print("No existing state file found, initializing new one")
                self._save_state()
        except Exception as e:
            print(f"⚠️ State loading error: {e}")
            self.new_entry_count = 0
            # Attempt to save default state
            try:
                self._save_state()
            except Exception as e2:
                print(f"⚠️ Failed to save initial state: {e2}")

    def _save_state(self):
        """Save current state to file"""
        try:
            # Create directory if it doesn't exist
            os.makedirs(os.path.dirname(self.state_path), exist_ok=True)
            
            state = {
                'new_entry_count': self.new_entry_count,
                'last_updated': datetime.now().isoformat()
            }
            with open(self.state_path, 'w') as f:
                json.dump(state, f, indent=2)
            print(f"State saved: {state}")
        except Exception as e:
            print(f"⚠️ State saving error: {e}")
            # Try with absolute path as fallback
            try:
                abs_path = os.path.abspath(self.state_path)
                os.makedirs(os.path.dirname(abs_path), exist_ok=True)
                with open(abs_path, 'w') as f:
                    json.dump(state, f, indent=2)
                print(f"State saved to absolute path: {abs_path}")
            except Exception as e2:
                print(f"⚠️ Absolute path save also failed: {e2}")

    def _validate_and_repair_file(self):
        """Validate and prepare the training data file"""
        try:
            if os.path.exists(self.training_data_path):
                self.original_df = pd.read_csv(self.training_data_path, low_memory=False)
                
                # Ensure critical columns exist
                required_cols = ['amt', 'city_pop', 'lat', 'long', 'merch_lat', 'merch_long',
                               'merchant', 'category', 'gender', 'trans_date_trans_time']
                
                for col in required_cols:
                    if col not in self.original_df.columns:
                        self.original_df[col] = None
                
                if 'is_fraud' not in self.original_df.columns:
                    self.original_df['is_fraud'] = 0
                if 'fraud_probability' not in self.original_df.columns:
                    self.original_df['fraud_probability'] = 0.0
                
                # Clean data
                self.original_df = self.original_df.dropna(subset=['is_fraud'])
                numeric_cols = self.original_df.select_dtypes(include=['number']).columns
                self.original_df[numeric_cols] = self.original_df[numeric_cols].fillna(0)
                    
                self.original_columns = self.original_df.columns.tolist()
                print(f"ℹ️ Loaded dataset with {len(self.original_df)} clean entries")
            else:
                raise FileNotFoundError(f"Training data file not found at {self.training_data_path}")
                
        except Exception as e:
            print(f"⚠️ File validation error: {e}")
            raise

    def _train_new_model(self):
        """Train a new model from current data"""
        print("⏳ Training new model...")
        
        try:
            # Define features and preprocessing
            numeric_features = ['amt', 'city_pop', 'cc_num','zip','lat','long','unix_time','merch_lat','merch_long']
            categorical_features = ['merchant', 'category', 'gender']
            
            preprocessor = ColumnTransformer(
                transformers=[
                    ('num', StandardScaler(), numeric_features),
                    ('cat', OneHotEncoder(handle_unknown='ignore'), categorical_features)
                ])
            
            # Create pipeline
            model = ImbPipeline([
                ('preprocessor', preprocessor),
                ('smote', SMOTE(random_state=42, sampling_strategy=0.1)),
                ('classifier', RandomForestClassifier(
                    n_estimators=200,
                    class_weight='balanced',
                    random_state=42,
                    n_jobs=-1
                ))
            ])
            
            # Prepare data
            features = numeric_features + categorical_features
            X = self.original_df[features]
            y = self.original_df['is_fraud']
            
            # Train-test split
            X_train, X_test, y_train, y_test = train_test_split(
                X, y, test_size=0.2, random_state=42, stratify=y
            )
            
            # Train model
            model.fit(X_train, y_train)
            
            # Save model
            joblib.dump(model, self.model_path)
            print("✅ New model trained and saved")
            
            return model
            
        except Exception as e:
            print(f"🚨 Training failed: {e}")
            return self.model if hasattr(self, 'model') else None

    # def _check_for_retrain(self):
    #     """Check if we need to retrain the model"""
    #     self.new_entry_count += 1
    #     self._save_state()  # Persist the counter immediately
        
    #     print(f"ℹ️ Entry count: {self.new_entry_count}/{self.retrain_interval}")
        
    #     if self.new_entry_count >= self.retrain_interval:
    #         print(f"🔁 Attempting retraining after {self.new_entry_count} new entries")
    #         try:
    #             old_model = self.model
    #             self.model = self._train_new_model()
                
    #             if self.model is not old_model:
    #                 print("🔄 Model successfully retrained")
    #                 self.new_entry_count = 0
    #                 self._save_state()  # Reset counter in persistent storage
    #                 return True
    #             else:
    #                 print("⚠️ Retraining failed - using previous model")
    #                 return False
                    
    #         except Exception as e:
    #             print(f"🚨 Retraining failed: {e}")
    #             return False
    #     return False

    def preprocess_new_entry(self, data_dict):
        """Preprocess a new transaction entry"""
        try:
            # Map incoming JSON to expected CSV structure
            transaction_data = data_dict.get('transaction_data', {})
            processed_data = {
                'trans_date_trans_time': transaction_data.get('trans_date_trans_time'),
                'cc_num': transaction_data.get('cardNum'),
                'merchant': transaction_data.get('merchant'),
                'category': transaction_data.get('category'),
                'amt': transaction_data.get('Amount'),
                'first': transaction_data.get('first'),
                'last': transaction_data.get('last'),
                'gender': transaction_data.get('gender'),
                'street': transaction_data.get('street'),
                'city': transaction_data.get('city'),
                'state': transaction_data.get('state'),
                'zip': transaction_data.get('zip'),
                'lat': transaction_data.get('lat'),
                'long': transaction_data.get('long'),
                'city_pop': transaction_data.get('city_pop'),
                'job': transaction_data.get('job'),
                'dob': transaction_data.get('dob'),
                'transaction_num': transaction_data.get('transactionId'),
                'unix_time': transaction_data.get('unix_time'),
                'merch_lat': transaction_data.get('merch_lat'),
                'merch_long': transaction_data.get('merch_long'),
                'is_fraud': transaction_data.get('is_fraud', 0)
            }
            # Default values
            defaults = {
                'amt': 0.0, 'city_pop': 1, 'lat': 0.0, 'long': 0.0,
                'merch_lat': 0.0, 'merch_long': 0.0, 'hour': 0,
                'day_of_week': 0, 'is_night': 0, 'distance_from_home': 0.0,
                'age': 0, 'amt_per_city_pop': 0.0, 'is_weekend': 0
            }
            data_dict = {**defaults, **data_dict}
            
            df = pd.DataFrame([data_dict])
            
            # Feature engineering
            df['trans_date_trans_time'] = pd.to_datetime(
                df['trans_date_trans_time'], errors='coerce'
            ).fillna(pd.Timestamp.now())
            
            df['hour'] = df['trans_date_trans_time'].dt.hour.fillna(0).astype(int)
            df['day_of_week'] = df['trans_date_trans_time'].dt.dayofweek.fillna(0).astype(int)
            df['is_night'] = ((df['hour'] >= 22) | (df['hour'] <= 5)).astype(int)
            df['is_weekend'] = (df['day_of_week'] >= 5).astype(int)
            
            df['distance_from_home'] = df.apply(
                lambda row: float(geodesic(
                    (float(row['lat']), float(row['long'])),
                    (float(row['merch_lat']), float(row['merch_long']))
                ).km),
                axis=1
            ).fillna(0)
            
            current_year = datetime.now().year
            df['age'] = (current_year - df['trans_date_trans_time'].dt.year.fillna(current_year)).astype(int)
            df['amt_per_city_pop'] = (df['amt'] / (df['city_pop'] + 1)).fillna(0)
            
            return df
            
        except Exception as e:
            print(f"🚨 Preprocessing failed: {e}")
            return None

    def predict_and_append(self, data_dict, threshold=0.2):
        """Process transaction with auto-retraining"""
        try:
            # Preprocess
            X_new = self.preprocess_new_entry(data_dict)
            if X_new is None:
                return "Error", 0.0
                
            # Predict
            probability = float(self.model.predict_proba(X_new)[0][1])
            prediction = 1 if probability >= threshold else 0
            
            # Prepare complete record
            complete_data = {
                **data_dict,
                'hour': int(X_new['hour'].values[0]),
                'day_of_week': int(X_new['day_of_week'].values[0]),
                'is_night': int(X_new['is_night'].values[0]),
                'is_weekend': int(X_new['is_weekend'].values[0]),
                'distance_from_home': float(X_new['distance_from_home'].values[0]),
                'age': int(X_new['age'].values[0]),
                'amt_per_city_pop': float(X_new['amt_per_city_pop'].values[0]),
                'is_fraud': int(prediction),
                'fraud_probability': float(probability),
                'processing_time': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            }
            
            # Append to dataset
            new_row = pd.DataFrame([complete_data])
            self.original_df = pd.concat([self.original_df, new_row], ignore_index=True)
            self.original_df.to_csv(self.training_data_path, index=False)
            
            print(f"✅ Appended: {'Fraud' if prediction else 'Not Fraud'} ({probability:.2%})")
            
            # Check if we need to retrain
            # self._check_for_retrain()
            
            return "Fraud" if prediction else "Not Fraud", probability
            
        except Exception as e:
            print(f"🚨 Processing failed: {e}")
            return "Error", 0.0


# ==================================================================
# INITIALIZE SYSTEMS
# ==================================================================
try:
    fraud_detector = PersistentAutoRetrainFraudDetector()
    smurfing_detector = SmurfingDetector(
        csv_file_path='filtered_data (1).csv',
        json_file_path='fraud_community.json'
    )
except Exception as e:
    print(f"Failed to initialize systems: {e}")
    fraud_detector = None
    smurfing_detector = None

# Initialize Groq-based LLM
chat = ChatGroq(model_name="llama-3.3-70b-versatile", api_key="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")

# ==================================================================
# API ENDPOINTS
# ==================================================================
@app.route('/predict', methods=['POST'])
def analyze_transaction():
    """Analyze transaction risk using ML model"""
    if fraud_detector is None:
        return jsonify({"error": "Fraud detection system not available"}), 500
    
    data = request.get_json()
    if not data:
        return jsonify({"error": "No transaction data provided"}), 400
    
    try:
        preprocessed_data = fraud_detector.preprocess_new_entry(data)
        if preprocessed_data is None:
            return jsonify({"error": "Error processing transaction data"}), 400
        
        features = ['amt', 'city_pop', 'distance_from_home', 'hour', 'day_of_week',
                   'is_night', 'age', 'amt_per_city_pop', 'merchant', 'category', 'gender']
        X = preprocessed_data[features]
        
        probability = fraud_detector.model.predict_proba(X)[0][1]
        risk_score = float(probability)
        
        if risk_score >= 0.7:
            risk_type = "High Risk"
        elif risk_score >= 0.3:
            risk_type = "Suspicious"
        else:
            risk_type = "Legitimate"
        
        return jsonify({
            "Transaction_ID": data.get('Transaction_ID', 'N/A'),
            "risk_score": risk_score,
            "category": risk_type
        })
    except Exception as e:
        return jsonify({"error": f"Prediction failed: {str(e)}"}), 500

@app.route('/detect_fraud', methods=['POST'])
def detect_fraud():
    """Comprehensive fraud detection with auto-retraining"""
    if fraud_detector is None:
        return jsonify({"error": "Fraud detection system not available"}), 500
    
    data = request.get_json()
    if not data:
        return jsonify({"error": "No transaction data provided"}), 400
    
    try:
        result, confidence = fraud_detector.predict_and_append(data)
        return jsonify({
            "Final Result": result,
            "Confidence": f"{confidence:.2%}",
            "risk_score": float(confidence),
            "category": "High Risk" if result == "Fraud" else "Low Risk"
        })
    except Exception as e:
        return jsonify({"error": f"Fraud detection failed: {str(e)}"}), 500

@app.route('/detect_smurfing', methods=['GET'])
def detect_smurfing_patterns():
    """Detect smurfing/structuring patterns"""
    if smurfing_detector is None:
        return jsonify({"error": "Smurfing detection system not available"}), 500
    
    try:
        results = smurfing_detector.detect_smurfing()
        return jsonify({
            "status": "success",
            "analysis": results,
            "timestamp": datetime.now().isoformat()
        })
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

@app.route('/extract_id', methods=['POST'])
def extract_id_details():
    """Extract name & DOB from ID card image"""
    if 'image' not in request.files:
        return jsonify({"error": "No image file provided"}), 400
    
    image_file = request.files['image']
    extracted_data = extract_text_from_id(image_file)
    return jsonify(extracted_data)
from math import radians, sin, cos, sqrt, atan2

# Add this haversine distance calculation function
def haversine(lat1, lon1, lat2, lon2):
    """
    Calculate the great circle distance between two points 
    on the earth (specified in decimal degrees)
    """
    # Convert decimal degrees to radians 
    lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
    
    # Haversine formula 
    dlat = lat2 - lat1 
    dlon = lon2 - lon1 
    a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
    c = 2 * atan2(sqrt(a), sqrt(1-a)) 
    r = 3956  # Radius of Earth in miles
    return c * r

@app.route('/analyze_transaction', methods=['POST'])
def unified_analysis():
    # Configuration (adjust these based on your model performance)
    FRAUD_THRESHOLD = 0.7  # Lowered from 0.9 to improve sensitivity
    SMURFING_THRESHOLD = 0.5
    GEO_DISTANCE_ALERT = 200  # miles
    HIGH_AMOUNT_THRESHOLD = 1000  # Dollars
    NIGHT_HOURS = (0, 6)  # 12am-6am
    
    data = request.get_json()
    if not data:
        return jsonify({"error": "No transaction data provided"}), 400
    
    response = {
        "timestamp": datetime.now().isoformat(),
        "fraud_detection": None,
        "smurfing_detection": None
    }

    # 1. Enhanced Fraud Detection
    if fraud_detector:
        try:
            # Get base prediction
            result, base_confidence = fraud_detector.predict_and_append(data)
            fraud_flags = []
            adjusted_confidence = float(base_confidence)
            
            # Rule-based confidence adjustments
            amount = float(data.get('amount', 0))
            transaction_time = pd.to_datetime(data.get('trans_date_trans_time'))
            
            # High amount flag
            if amount > HIGH_AMOUNT_THRESHOLD:
                fraud_flags.append(f"high_amount_{amount}")
                adjusted_confidence = min(adjusted_confidence + 0.25, 1.0)
            
            # Geographic check
            if all(k in data for k in ['lat', 'long', 'merch_lat', 'merch_long']):
                try:
                    distance = haversine(
                        float(data['lat']), float(data['long']),
                        float(data['merch_lat']), float(data['merch_long'])
                    )
                    if distance > GEO_DISTANCE_ALERT:
                        fraud_flags.append(f"geolocation_mismatch_{distance:.1f}_miles")
                        adjusted_confidence = min(adjusted_confidence + 0.3, 1.0)
                except (ValueError, TypeError) as e:
                    print(f"Geolocation error: {str(e)}")
            
            # Late night transaction
            if transaction_time.hour in range(*NIGHT_HOURS):
                fraud_flags.append(f"late_night_{transaction_time.hour}h")
                adjusted_confidence = min(adjusted_confidence + 0.15, 1.0)
            
            # High-risk merchant pattern
            merchant = str(data.get('merchant', '')).lower()
            if any(term in merchant for term in ['highrisk', 'fraud', 'electronics']):
                fraud_flags.append("high_risk_merchant")
                adjusted_confidence = min(adjusted_confidence + 0.2, 1.0)
            
            response["fraud_detection"] = {
                "system": "ml_fraud_detection",
                "result": "Fraud" if adjusted_confidence >= FRAUD_THRESHOLD else "Not Fraud",
                "base_confidence": float(base_confidence),
                "adjusted_confidence": float(adjusted_confidence),
                "threshold": FRAUD_THRESHOLD,
                "flags": fraud_flags,
                "is_above_threshold": adjusted_confidence >= FRAUD_THRESHOLD,
                "amount": amount,
                "rules_applied": len(fraud_flags)
            }

        except Exception as e:
            response["fraud_detection"] = {
                "error": str(e),
                "system": "ml_fraud_detection"
            }

    if smurfing_detector:
        try:
            temp_df = pd.DataFrame([{
                'Sender_account': data.get('cardNum'),
                'Receiver_account': data.get('merchant'),
                'Amount': float(data.get('amount', 0)),
                'DateTime': pd.to_datetime(data.get('trans_date_trans_time')),
                'Transaction_ID': data.get('transactionId')
            }])
            
            # Store original data
            original_df = smurfing_detector.df
            
            # Perform analysis with temporary data
            smurfing_detector.df = pd.concat([original_df, temp_df], ignore_index=True)
            
            # Use enhanced detection
            results = smurfing_detector.detect_smurfing_enhanced(temp_df.iloc[0].to_dict())
            
            response["smurfing_detection"] = {
                "system": "smurfing_detection",
                "threshold": SMURFING_THRESHOLD,
                "analysis": results,
                "transaction_count": len(smurfing_detector.df),
                "detection_method": "enhanced_pattern_analysis"
            }
            
            # Restore original data
            smurfing_detector.df = original_df
            
        except Exception as e:
            response["smurfing_detection"] = {
                "error": str(e),
                "system": "smurfing_detection"
            }
    
    return jsonify(response)

# ==================================================================
# HELPER FUNCTIONS
# ==================================================================
def extract_text_from_id(image_file):
    """OCR for ID cards using Groq API"""
    image_data = base64.b64encode(image_file.read()).decode('utf-8')

    prompt = """
    Perform OCR on the given image of a government ID card and extract:
    - Full Name
    - Date of Birth (DOB)
    
    Response format: {"name": "<full_name>", "dob": "<YYYY-MM-DD>"}
    """

    response = chat([
        SystemMessage(content="You are an OCR expert specializing in ID cards."),
        HumanMessage(content=prompt, attachments=[{"type": "image", "data": image_data}])
    ])

    response_text = response.content.strip()
    return json.loads(response_text) if response_text else {"error": "Invalid OCR response format"}

def extract_risk_details(response_text):
    """Extract risk_score and type from API response"""
    score_match = re.search(r'"risk_score"\s*:\s*([\d.]+)', response_text)
    type_match = re.search(r'"type"\s*:\s*"([^"]+)"', response_text)

    if score_match and type_match:
        risk_score = float(score_match.group(1))
        risk_type = type_match.group(1)
        return {"risk_score": risk_score, "type": risk_type}
    
    return {"risk_score": None, "type": "Error"}

if __name__ == '__main__':
    app.run(debug=True)