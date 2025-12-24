/**
 * useModal - Unified hook for modal state management
 *
 * Provides consistent open/close/toggle semantics for modal dialogs.
 * Designed to work with the Modal component from components/UI/overlay/Modal.
 *
 * @example
 * // Basic usage
 * const helpModal = useModal();
 * <Button onClick={helpModal.open}>Help</Button>
 * <Modal isOpen={helpModal.isOpen} onClose={helpModal.close} title="Help">
 *   Content here
 * </Modal>
 *
 * @example
 * // With callback on close
 * const editModal = useModal({
 *   onOpen: () => fetchItemData(itemId),
 *   onClose: () => resetForm()
 * });
 *
 * @example
 * // Start open
 * const welcomeModal = useModal({ initialOpen: true });
 */

import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * @typedef {Object} UseModalOptions
 * @property {boolean} [initialOpen=false] - Whether modal starts open
 * @property {Function} [onOpen] - Callback when modal opens
 * @property {Function} [onClose] - Callback when modal closes
 * @property {boolean} [closeOnEscape=true] - Whether Escape key closes modal
 */

/**
 * @typedef {Object} UseModalReturn
 * @property {boolean} isOpen - Current open state
 * @property {Function} open - Opens the modal
 * @property {Function} close - Closes the modal
 * @property {Function} toggle - Toggles the modal
 * @property {Function} setOpen - Direct setter for open state
 */

/**
 * Hook for managing modal open/close state
 * @param {UseModalOptions} [options] - Configuration options
 * @returns {UseModalReturn} Modal state and controls
 */
export function useModal(options = {}) {
  const {
    initialOpen = false,
    onOpen,
    onClose,
  } = options;

  const [isOpen, setIsOpen] = useState(initialOpen);

  // Track if component is mounted to avoid state updates after unmount
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const open = useCallback(() => {
    if (!mountedRef.current) return;
    setIsOpen(true);
    onOpen?.();
  }, [onOpen]);

  const close = useCallback(() => {
    if (!mountedRef.current) return;
    setIsOpen(false);
    onClose?.();
  }, [onClose]);

  const toggle = useCallback(() => {
    if (!mountedRef.current) return;
    setIsOpen(prev => {
      const next = !prev;
      if (next) {
        onOpen?.();
      } else {
        onClose?.();
      }
      return next;
    });
  }, [onOpen, onClose]);

  const setOpen = useCallback((value) => {
    if (!mountedRef.current) return;
    const nextValue = typeof value === 'function' ? value(isOpen) : value;
    if (nextValue !== isOpen) {
      setIsOpen(nextValue);
      if (nextValue) {
        onOpen?.();
      } else {
        onClose?.();
      }
    }
  }, [isOpen, onOpen, onClose]);

  return {
    isOpen,
    open,
    close,
    toggle,
    setOpen,
  };
}

/**
 * useModalWithData - Modal hook that also manages associated data
 *
 * Useful when opening a modal requires loading or setting data.
 *
 * @example
 * const editModal = useModalWithData();
 *
 * // Open with data
 * <Button onClick={() => editModal.openWith(character)}>Edit</Button>
 *
 * // Access in modal
 * <Modal isOpen={editModal.isOpen} onClose={editModal.close}>
 *   <EditForm character={editModal.data} />
 * </Modal>
 */
export function useModalWithData(options = {}) {
  const modal = useModal(options);
  const [data, setData] = useState(null);

  const openWith = useCallback((newData) => {
    setData(newData);
    modal.open();
  }, [modal]);

  const close = useCallback(() => {
    modal.close();
    // Optionally clear data on close (delayed to allow exit animation)
    setTimeout(() => {
      setData(null);
    }, 300);
  }, [modal]);

  return {
    ...modal,
    close,
    data,
    setData,
    openWith,
  };
}

/**
 * useConfirmModal - Modal hook for confirmation dialogs
 *
 * Tracks the action to be confirmed and provides confirm/cancel handlers.
 *
 * @example
 * const deleteConfirm = useConfirmModal({
 *   onConfirm: async (itemId) => {
 *     await deleteItem(itemId);
 *     showToast('Deleted!');
 *   }
 * });
 *
 * // Trigger confirmation
 * <Button onClick={() => deleteConfirm.requestConfirm(item.id)}>Delete</Button>
 *
 * // Render dialog
 * <ConfirmDialog
 *   isOpen={deleteConfirm.isOpen}
 *   title="Delete Item?"
 *   message="This cannot be undone."
 *   onConfirm={deleteConfirm.confirm}
 *   onCancel={deleteConfirm.cancel}
 *   loading={deleteConfirm.loading}
 * />
 */
export function useConfirmModal(options = {}) {
  const { onConfirm, onCancel } = options;
  const modal = useModal();
  const [pendingData, setPendingData] = useState(null);
  const [loading, setLoading] = useState(false);

  const requestConfirm = useCallback((data = null) => {
    setPendingData(data);
    modal.open();
  }, [modal]);

  const confirm = useCallback(async () => {
    if (onConfirm) {
      setLoading(true);
      try {
        await onConfirm(pendingData);
        modal.close();
        setPendingData(null);
      } catch (error) {
        // Error handling should be done in onConfirm
        console.error('Confirm action failed:', error);
      } finally {
        setLoading(false);
      }
    } else {
      modal.close();
      setPendingData(null);
    }
  }, [onConfirm, pendingData, modal]);

  const cancel = useCallback(() => {
    modal.close();
    setPendingData(null);
    onCancel?.();
  }, [modal, onCancel]);

  return {
    isOpen: modal.isOpen,
    requestConfirm,
    confirm,
    cancel,
    loading,
    pendingData,
  };
}

export default useModal;
