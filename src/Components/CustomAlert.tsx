import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import { Modal, Pressable, Text, View } from 'react-native';

type AlertVariant = 'info' | 'success' | 'warning' | 'error';

export type CustomAlertButton = {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
};

type AlertOptions = {
  variant?: AlertVariant;
  buttons?: CustomAlertButton[];
};

type AlertRequest = {
  title: string;
  message: string;
  variant: AlertVariant;
  buttons: CustomAlertButton[];
};

type AlertContextValue = {
  showAlert: (title: string, message?: string, options?: AlertOptions) => void;
};

const AlertContext = createContext<AlertContextValue | null>(null);

const variantStyles: Record<AlertVariant, { accent: string; icon: string }> = {
  info: { accent: '#07564B', icon: 'i' },
  success: { accent: '#15803D', icon: '✓' },
  warning: { accent: '#B8860B', icon: '!' },
  error: { accent: '#B42332', icon: '!' },
};

export function CustomAlertProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [request, setRequest] = useState<AlertRequest | null>(null);

  const showAlert = useCallback(
    (title: string, message = '', options: AlertOptions = {}) => {
      setRequest({
        title,
        message,
        variant: options.variant || 'info',
        buttons: options.buttons?.length
          ? options.buttons
          : [{ text: 'OK' }],
      });
    },
    [],
  );

  const dismiss = useCallback(() => setRequest(null), []);
  const contextValue = useMemo(() => ({ showAlert }), [showAlert]);
  const style = request ? variantStyles[request.variant] : variantStyles.info;

  return (
    <AlertContext.Provider value={contextValue}>
      {children}
      <Modal
        transparent
        animationType="fade"
        visible={request !== null}
        onRequestClose={dismiss}>
        <View className="flex-1 items-center justify-center bg-black/45 px-6">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Dismiss alert"
            onPress={dismiss}
            className="absolute inset-0"
          />
          {request ? (
            <View
              accessible
              accessibilityRole="alert"
              className="w-full max-w-[420px] overflow-hidden rounded-3xl bg-white shadow-2xl">
              <View className="h-1.5" style={{ backgroundColor: style.accent }} />
              <View className="p-5">
                <View className="mb-4 flex-row items-center">
                  <View
                    className="mr-3 h-10 w-10 items-center justify-center rounded-full"
                    style={{ backgroundColor: `${style.accent}18` }}>
                    <Text
                      className="text-lg font-extrabold"
                      style={{ color: style.accent }}>
                      {style.icon}
                    </Text>
                  </View>
                  <Text className="flex-1 text-lg font-extrabold text-[#173F35]">
                    {request.title}
                  </Text>
                </View>
                {request.message ? (
                  <Text className="text-sm leading-6 text-[#52645F]">
                    {request.message}
                  </Text>
                ) : null}
                <View className="mt-6 flex-row justify-end gap-2">
                  {request.buttons.map((button, index) => {
                    const isDestructive = button.style === 'destructive';
                    const isCancel = button.style === 'cancel';
                    const backgroundColor = isDestructive
                      ? '#B42332'
                      : isCancel
                        ? '#F3F4F1'
                        : style.accent;
                    const textColor = isCancel ? '#52645F' : '#FFFFFF';
                    return (
                      <Pressable
                        key={`${button.text}-${index}`}
                        accessibilityRole="button"
                        onPress={() => {
                          setRequest(null);
                          button.onPress?.();
                        }}
                        className="min-w-[88px] items-center rounded-xl px-4 py-3"
                        style={{ backgroundColor }}>
                        <Text
                          className="text-sm font-bold"
                          style={{ color: textColor }}>
                          {button.text}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </View>
          ) : null}
        </View>
      </Modal>
    </AlertContext.Provider>
  );
}

export function useCustomAlert() {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useCustomAlert must be used within CustomAlertProvider.');
  }
  return context;
}
