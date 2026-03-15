import { useState, useCallback } from 'react';
import { CustomAlertButton } from '@/components/ui/CustomAlert';

interface AlertState {
  visible: boolean;
  title: string;
  message?: string;
  buttons?: CustomAlertButton[];
}

export function useCustomAlert() {
  const [alertState, setAlertState] = useState<AlertState>({
    visible: false,
    title: '',
    message: '',
    buttons: [],
  });

  const showAlert = useCallback(
    (title: string, message?: string, buttons?: CustomAlertButton[]) => {
      setAlertState({
        visible: true,
        title,
        message,
        buttons: buttons || [{ text: 'OK', style: 'default' }],
      });
    },
    []
  );

  const hideAlert = useCallback(() => {
    setAlertState((prev) => ({ ...prev, visible: false }));
  }, []);

  return {
    alertState,
    showAlert,
    hideAlert,
  };
}
