import React, { useState, useEffect } from "react";

interface RemainingTimeProps {
  endOfDay: string;
}

const RemainingTime: React.FC<RemainingTimeProps> = ({ endOfDay }) => {
  const [remaining, setRemaining] = useState("");

  useEffect(() => {
    const calculateRemaining = () => {
      const now = new Date();
      const end = new Date();
      const [hours, minutes] = endOfDay.split(":").map(Number);
      end.setHours(hours, minutes, 0, 0);

      if (end < now) {
        setRemaining("Día finalizado");
        return;
      }

      let diff = end.getTime() - now.getTime();

      const h = Math.floor(diff / (1000 * 60 * 60));
      diff -= h * 1000 * 60 * 60;
      const m = Math.floor(diff / (1000 * 60));

      setRemaining(`${h}h ${m}m`);
    };

    calculateRemaining();
    const timer = setInterval(calculateRemaining, 60000); // Update every minute

    return () => clearInterval(timer);
  }, [endOfDay]);

  return <p className="font-semibold text-slate-400">{remaining}</p>;
};

export default RemainingTime;