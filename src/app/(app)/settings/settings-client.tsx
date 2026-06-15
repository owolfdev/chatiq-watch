"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, Loader2 } from "lucide-react";

import { getPublicEnv } from "@/lib/env";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function SettingsClient({
  initialPushEnabled,
}: {
  initialPushEnabled: boolean;
}) {
  const [pushEnabled, setPushEnabled] = useState(initialPushEnabled);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    setSupported(
      typeof window !== "undefined" &&
        "serviceWorker" in navigator &&
        "PushManager" in window &&
        window.isSecureContext,
    );
  }, []);

  const enablePush = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const { vapidPublicKey } = getPublicEnv();
      if (!vapidPublicKey) {
        throw new Error("VAPID public key is not configured.");
      }

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        throw new Error("Notification permission was not granted.");
      }

      const registration = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });

      const response = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscription: subscription.toJSON(),
          userAgent: navigator.userAgent,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save push subscription.");
      }

      setPushEnabled(true);
      setMessage("Push alerts enabled for hard smoke failures.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to enable push.");
    } finally {
      setLoading(false);
    }
  };

  const disablePush = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const registration = await navigator.serviceWorker.getRegistration("/sw.js");
      const subscription = await registration?.pushManager.getSubscription();
      const endpoint = subscription?.endpoint;

      if (endpoint) {
        await fetch("/api/push/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint }),
        });
        await subscription.unsubscribe();
      }

      setPushEnabled(false);
      setMessage("Push alerts disabled.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to disable push.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-2xl font-semibold">Alert settings</h1>
        <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
          Receive push notifications when scheduled smoke tests fail.
        </p>
      </section>

      <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-6 space-y-4">
        {!supported ? (
          <p className="text-sm text-[var(--color-warning)]">
            Push requires HTTPS and a browser that supports service workers.
          </p>
        ) : null}

        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-medium">Critical smoke failures</p>
            <p className="text-sm text-[var(--color-muted-foreground)]">
              One consolidated alert per failed cron run (health, canned, or LLM check).
            </p>
          </div>
          <button
            type="button"
            disabled={loading || !supported}
            onClick={pushEnabled ? disablePush : enablePush}
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-black disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : pushEnabled ? (
              <BellOff className="h-4 w-4" />
            ) : (
              <Bell className="h-4 w-4" />
            )}
            {pushEnabled ? "Disable push" : "Enable push"}
          </button>
        </div>

        {message ? (
          <p className="text-sm text-[var(--color-muted-foreground)]">{message}</p>
        ) : null}
      </section>
    </div>
  );
}
