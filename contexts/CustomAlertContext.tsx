import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { CustomAlert, CustomAlertButton } from '@/components/ui/CustomAlert';

interface AlertState {
  visible: boolean;
  title: string;
  message?: string;
  buttons?: CustomAlertButton[];
}

interface CustomAlertContextType {
  showAlert: (title: string, message?: string, buttons?: CustomAlertButton[]) => void;
}

const CustomAlertContext = createContext<CustomAlertContextType | undefined>(undefined);

export function CustomAlertProvider({ children }: { children: ReactNode }) {
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

  return (
    <CustomAlertContext.Provider value={{ showAlert }}>
      {children}
      <CustomAlert
        visible={alertState.visible}
        title={alertState.title}
        message={alertState.message}
        buttons={alertState.buttons}
        onDismiss={hideAlert}
      />
    </CustomAlertContext.Provider>
  );
}

export function useCustomAlert() {
  const context = useContext(CustomAlertContext);
  if (!context) {
    throw new Error('useCustomAlert must be used within CustomAlertProvider');
  }
  return context;
}
