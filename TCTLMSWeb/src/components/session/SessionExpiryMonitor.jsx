import React, { useCallback, useEffect, useState } from "react";
import { Button, Modal, ModalBody, ModalFooter, ModalHeader, Spinner } from "reactstrap";
import { logoutSession, refreshSession } from "../../library/axios";

const WARNING_BEFORE_MS = 5 * 60 * 1000;

const SessionExpiryMonitor = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [remainingMinutes, setRemainingMinutes] = useState(0);
  const [continuing, setContinuing] = useState(false);

  const checkExpiry = useCallback(() => {
    const accessToken = localStorage.getItem("accessToken");
    const expiryValue = localStorage.getItem("refreshTokenExpiresAt");
    if (!accessToken || !expiryValue) {
      setIsOpen(false);
      return;
    }

    const remaining = new Date(expiryValue).getTime() - Date.now();
    if (!Number.isFinite(remaining)) return;
    if (remaining <= 0) {
      logoutSession();
      return;
    }

    setRemainingMinutes(Math.max(1, Math.ceil(remaining / 60000)));
    setIsOpen(remaining <= WARNING_BEFORE_MS);
  }, []);

  useEffect(() => {
    checkExpiry();
    const timer = window.setInterval(checkExpiry, 30000);
    window.addEventListener("session-refreshed", checkExpiry);
    window.addEventListener("storage", checkExpiry);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("session-refreshed", checkExpiry);
      window.removeEventListener("storage", checkExpiry);
    };
  }, [checkExpiry]);

  const continueSession = async () => {
    setContinuing(true);
    try {
      await refreshSession();
      setIsOpen(false);
    } catch {
      // The refresh helper redirects to login when the cookie has expired or was revoked.
    } finally {
      setContinuing(false);
    }
  };

  return (
    <Modal isOpen={isOpen} backdrop="static" keyboard={false} className="modal-dialog-centered">
      <ModalHeader>Session Expiring</ModalHeader>
      <ModalBody>
        Your session will expire in approximately {remainingMinutes} minute{remainingMinutes === 1 ? "" : "s"}.
        Would you like to continue working?
      </ModalBody>
      <ModalFooter>
        <Button color="primary" onClick={continueSession} disabled={continuing}>
          {continuing ? <Spinner size="sm" /> : "Continue Session"}
        </Button>
        <Button color="secondary" onClick={logoutSession} disabled={continuing}>Logout</Button>
      </ModalFooter>
    </Modal>
  );
};

export default SessionExpiryMonitor;
