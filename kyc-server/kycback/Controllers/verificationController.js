const { VerificationRequest, DeviceInfo } = require('../models/verificationSchema');
const { IndividualKYC } = require('../models/kycSchema');
const { automatedVerification } = require('../services/verification/verificationService');
const jwt = require('jsonwebtoken');
const { default: mongoose } = require('mongoose');
// const { scribe } = import("scribe.js-ocr");
const fs = require("fs")

// Helper function to extract MAC address from request
const extractDeviceInfo = (req) => {
  return {
    macAddress: req.body.macAddress || req.headers['x-mac-address'] || 'unknown',
    ipAddress: req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress,
    deviceFingerprint: req.body.deviceFingerprint || req.headers['x-device-fingerprint'] || 'unknown',
    userAgent: req.headers['user-agent']
  };
};

// Validate token and extract user ID
const validateToken = (req) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) throw new Error('No token provided');
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded.userId;
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
};

// Trigger initial verification after KYC submission
const initiateInitialVerification = async (req, res) => {
  try {
    let userId = req.params.userId;

    // Fetch the KYC record
    const kycRecord = await IndividualKYC.findOne({ userId: new mongoose.Types.ObjectId(userId) });
    if (!kycRecord) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Extract identity proof document
    const identityProofPath = kycRecord.identityProof.documentUrl;
    console.log(kycRecord)
    const extractedInfo = await performOCR(identityProofPath);

    const formatDate = (date) => date.toISOString().split("T")[0];

    // Verify extracted info with KYC data
    const kycDob = formatDate(kycRecord.dateOfBirth);
    const isMatch = kycDob === extractedInfo;

    // Create verification request
    const deviceInfo = extractDeviceInfo(req);
    const verificationRequest = new VerificationRequest({
      userId,
      deviceInfo,
      verificationType: 'initial',
      verificationPhoto: req.body.selfiePhoto,
      verificationStatus: isMatch ? 'verified' : 'rejected'
    });

    await verificationRequest.save();

    res.status(201).json({
      message: 'Initial verification processed',
      verificationId: verificationRequest._id,
      status: verificationRequest.verificationStatus,
      result: { isMatch, extractedInfo }
    });
  } catch (error) {
    console.error('Error initiating initial verification:', error);
    res.status(500).json({ message: 'Error initiating initial verification', error: error.message });
  }
};

// OCR function to extract data from the document using fetch
const performOCR = async (documentPath) => {
  try {
    // const formData = new FormData();
    // formData.append('file', fs.createReadStream(documentPath));
    console.log(documentPath);

    const scribe = await import('scribe.js-ocr');
    const { extractText, terminate } = scribe.default || scribe;
    const res = await extractText([documentPath]);
    const regex = /\b(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[0-2])\/(19[0-9]{2}|20[0-9]{2})\b/;

    const match = res.match(regex);
    const dob = match[0].replaceAll("/","-")
    // Convert input date string to a valid Date object
const [day, month, year] = dob.split("-").map(Number);
const inputDate = new Date(Date.UTC(year, month - 1, day)); // Convert to UTC

// Format both dates to 'YYYY-MM-DD' for comparison
const formatDate = (date) => date.toISOString().split("T")[0];

    if (match) {
        console.log("Extracted DOB:", formatDate(inputDate));
    } else {
        console.log("No date found.");
    }
    await terminate();

    // Assuming the API returns extracted name and ID number
    // return {
    //   name: res.name,
    //   idNumber: res.id_number
    // };
    return formatDate(inputDate);
  } catch (error) {
    console.error('Error performing OCR:', error);
    throw new Error('OCR extraction failed');
  }
};

// Create a new verification request when suspicious activity is detected
const initiateReverification = async (req, res) => {
  try {
    let userId;
    try {
      userId = validateToken(req);
    } catch (error) {
      return res.status(401).json({ message: error.message });
    }

    // Find the user's KYC record
    const kycRecord = await IndividualKYC.findById(userId);
    if (!kycRecord) {
      return res.status(404).json({ message: 'User not found' });
    }

    const deviceInfo = extractDeviceInfo(req);
    
    // Create verification request
    const verificationRequest = new VerificationRequest({
      userId,
      deviceInfo,
      verificationType: 're-verification',
      suspiciousActivity: {
        reason: req.body.reason || 'Suspicious transaction pattern detected',
        detectedAt: new Date(),
        additionalDetails: req.body.details || {}
      }
    });

    await verificationRequest.save();

    res.status(201).json({ 
      message: 'Re-verification initiated', 
      verificationId: verificationRequest._id,
      status: 'pending'
    });
  } catch (error) {
    console.error('Error initiating re-verification:', error);
    res.status(500).json({ message: 'Error initiating re-verification', error: error.message });
  }
};

// Submit photo for re-verification
const submitReverificationPhoto = async (req, res) => {
  try {
    let userId;
    try {
      userId = validateToken(req);
    } catch (error) {
      return res.status(401).json({ message: error.message });
    }

    const { verificationId } = req.params;
    const { photo } = req.body;

    if (!photo) {
      return res.status(400).json({ message: 'Photo is required' });
    }

    // Find the verification request
    const verificationRequest = await VerificationRequest.findById(verificationId);
    if (!verificationRequest) {
      return res.status(404).json({ message: 'Verification request not found' });
    }

    // Check if this verification belongs to the authenticated user
    if (verificationRequest.userId.toString() !== userId) {
      return res.status(403).json({ message: 'Unauthorized access to verification request' });
    }

    // Update the verification request with the photo
    verificationRequest.verificationPhoto = photo;
    verificationRequest.verificationStatus = 'pending'; // Reset to pending if it was previously rejected
    verificationRequest.verificationAttempts += 1;
    
    await verificationRequest.save();

    // Trigger automated verification
    const verificationResult = await automatedVerification(verificationId);

    res.status(200).json({ 
      message: 'Re-verification photo submitted successfully',
      status: verificationRequest.verificationStatus,
      result: verificationResult
    });
  } catch (error) {
    console.error('Error submitting re-verification photo:', error);
    res.status(500).json({ message: 'Error submitting re-verification photo', error: error.message });
  }
};

// Check verification status
const checkVerificationStatus = async (req, res) => {
  try {
    let userId;
    try {
      userId = validateToken(req);
    } catch (error) {
      return res.status(401).json({ message: error.message });
    }

    const { verificationId } = req.params;

    // Find the verification request
    const verificationRequest = await VerificationRequest.findById(verificationId);
    if (!verificationRequest) {
      return res.status(404).json({ message: 'Verification request not found' });
    }

    // Check if this verification belongs to the authenticated user
    if (verificationRequest.userId.toString() !== userId) {
      return res.status(403).json({ message: 'Unauthorized access to verification request' });
    }

    res.status(200).json({ 
      status: verificationRequest.verificationStatus,
      requestedAt: verificationRequest.requestedAt,
      verifiedAt: verificationRequest.verifiedAt,
      attempts: verificationRequest.verificationAttempts
    });
  } catch (error) {
    console.error('Error checking verification status:', error);
    res.status(500).json({ message: 'Error checking verification status', error: error.message });
  }
};

// Admin endpoint to approve or reject verification
const processVerification = async (req, res) => {
  try {
    // Verify admin token (in a real implementation)
    // For demo purposes, we're skipping this step

    const { verificationId } = req.params;
    const { status, feedback } = req.body;

    if (!['verified', 'rejected', 'suspicious'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    // Find the verification request
    const verificationRequest = await VerificationRequest.findById(verificationId);
    if (!verificationRequest) {
      return res.status(404).json({ message: 'Verification request not found' });
    }

    // Update the verification request
    verificationRequest.verificationStatus = status;
    if (status === 'verified') {
      verificationRequest.verifiedAt = new Date();
      
      // Update user's KYC verification status
      await IndividualKYC.findByIdAndUpdate(
        verificationRequest.userId,
        { 
          verificationStatus: 'verified',
          lastVerifiedAt: new Date()
        }
      );
    } else if (status === 'rejected' || status === 'suspicious') {
      // Update user's KYC verification status
      await IndividualKYC.findByIdAndUpdate(
        verificationRequest.userId,
        { verificationStatus: status === 'suspicious' ? 'suspended' : 'rejected' }
      );
    }

    await verificationRequest.save();

    res.status(200).json({ 
      message: `Verification ${status}`,
      verificationId
    });
  } catch (error) {
    console.error('Error processing verification:', error);
    res.status(500).json({ message: 'Error processing verification', error: error.message });
  }
};

// Get all pending verifications (admin endpoint)
const getPendingVerifications = async (req, res) => {
  try {
    // Verify admin token (in a real implementation)
    // For demo purposes, we're skipping this step

    const pendingVerifications = await VerificationRequest.find({
      verificationStatus: 'pending'
    }).populate('userId', 'name email');

    res.status(200).json(pendingVerifications);
  } catch (error) {
    console.error('Error fetching pending verifications:', error);
    res.status(500).json({ message: 'Error fetching pending verifications', error: error.message });
  }
};

// Get user's verification history
const getUserVerificationHistory = async (req, res) => {
  try {
    let userId;
    try {
      userId = validateToken(req);
    } catch (error) {
      return res.status(401).json({ message: error.message });
    }

    const verificationHistory = await VerificationRequest.find({
      userId
    }).sort({ requestedAt: -1 });

    res.status(200).json(verificationHistory);
  } catch (error) {
    console.error('Error fetching user verification history:', error);
    res.status(500).json({ message: 'Error fetching verification history', error: error.message });
  }
};

// Get current user verification status
const getCurrentVerificationStatus = async (req, res) => {
  try {
    let userId;
    try {
      userId = validateToken(req);
    } catch (error) {
      return res.status(401).json({ message: error.message });
    }

    const kycRecord = await IndividualKYC.findById(userId);
    if (!kycRecord) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({ 
      verificationStatus: kycRecord.verificationStatus,
      lastVerifiedAt: kycRecord.lastVerifiedAt
    });
  } catch (error) {
    console.error('Error fetching current verification status:', error);
    res.status(500).json({ message: 'Error fetching verification status', error: error.message });
  }
};

module.exports = {
  initiateInitialVerification,
  initiateReverification,
  submitReverificationPhoto,
  checkVerificationStatus,
  processVerification,
  getPendingVerifications,
  getUserVerificationHistory,
  getCurrentVerificationStatus
};