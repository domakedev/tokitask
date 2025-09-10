
import React, { useEffect, useState } from 'react';

interface NotificationToastProps {
    message: string;
    type: 'success' | 'error';
    onDismiss: () => void;
}

const NotificationToast: React.FC<NotificationToastProps> = ({ message, type, onDismiss }) => {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (message) {
            setVisible(true);
            const timer = setTimeout(() => {
                setVisible(false);
                setTimeout(onDismiss, 300); // Wait for transition to finish
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [message, onDismiss]);

    const bgColor = type === 'success' ? 'bg-green-500' : 'bg-red-500';

    return (
        <div className={`fixed top-5 right-5 text-white py-2 px-4 rounded-lg shadow-md z-50 transition-all duration-300 ${visible ? 'opacity-100 transform translate-y-0' : 'opacity-0 transform -translate-y-10'} ${bgColor}`}>
            <p>{message}</p>
        </div>
    );
};

export default NotificationToast;
