import { useContext } from 'react';
import { ToastContext } from './toastContextValue';

export const useToast = () => useContext(ToastContext);
