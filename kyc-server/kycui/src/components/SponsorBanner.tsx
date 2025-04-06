
import { Separator } from "@/components/ui/separator";

const sponsors = [
  { name: "Aubergine Solutions", logoText: "Aubergine" },
  { name: "ETHindia", logoText: "ETHindia" },
  { name: "Rapidops", logoText: "RapidOps" },
  { name: "Pedals Up", logoText: "Pedals Up" },
  { name: "Petpooja", logoText: "PetPooja" },
  { name: "ReveSoils", logoText: "ReveSoils" },
];

const SponsorBanner = () => {
  return (
    <div className="w-full max-w-md">
      <div className="flex flex-col items-center space-y-2">
        <p className="text-sm text-muted-foreground">Sponsored by</p>
        <div className="grid grid-cols-3 gap-4 w-full">
          {sponsors.map((sponsor) => (
            <div
              key={sponsor.name}
              className="flex items-center justify-center h-10 rounded-md bg-secondary/50 px-3 text-xs font-medium"
            >
              {sponsor.logoText}
            </div>
          ))}
        </div>
        <Separator className="mt-6 bg-border/30" />
        <p className="text-xs text-muted-foreground pt-2">
          © 2025 Hackathon. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default SponsorBanner;
