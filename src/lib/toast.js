// Simple Toast Notification Service
// Uses react-toastify which is already in dependencies

import { toast } from 'react-toastify';

export const showToast = {
  success: (message, options = {}) => {
    toast.success(message, {
      position: 'top-right',
      autoClose: 3000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      ...options
    });
  },
  error: (message, options = {}) => {
    toast.error(message, {
      position: 'top-right',
      autoClose: 4000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      ...options
    });
  },
  info: (message, options = {}) => {
    toast.info(message, {
      position: 'top-right',
      autoClose: 3000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      ...options
    });
  },
  warning: (message, options = {}) => {
    toast.warning(message, {
      position: 'top-right',
      autoClose: 3000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      ...options
    });
  },
  loading: (message, options = {}) => {
    return toast.loading(message, {
      position: 'top-right',
      ...options
    });
  },
  update: (toastId, options = {}) => {
    toast.update(toastId, {
      autoClose: 3000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      ...options
    });
  },
  dismiss: (toastId) => {
    toast.dismiss(toastId);
  },
  dismissAll: () => {
    toast.dismiss();
  }
};

export default showToast;
