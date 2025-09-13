import React, { useState, useEffect } from "react";

const CurrentDate: React.FC = () => {
  const [dateTime, setDateTime] = useState("");

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const dateOptions: Intl.DateTimeFormatOptions = {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      };
      const timeOptions: Intl.DateTimeFormatOptions = {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      };
      const dateString = now.toLocaleDateString("es-ES", dateOptions);
      const timeString = now.toLocaleTimeString("es-ES", timeOptions);
      setDateTime(`${dateString} | ${timeString}`);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return <p className="text-sm text-slate-400">{dateTime}</p>;
};

export default CurrentDate;