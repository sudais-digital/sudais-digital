"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { User } from "firebase/auth";
import { useRouter } from "next/navigation";

import { db } from "../lib/firebase";

type NotificationType =
  | "order"
  | "deposit"
  | "premium"
  | "referral"
  | "general";

type NotificationItem = {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  read: boolean;
  createdAt: Timestamp | null;
  link?: string;
};

type NotificationCenterProps = {
  user: User | null;
};

function getNotificationIcon(type: NotificationType): string {
  switch (type) {
    case "order":
      return "📦";

    case "deposit":
      return "💰";

    case "premium":
      return "💎";

    case "referral":
      return "🎁";

    default:
      return "🔔";
  }
}

function formatNotificationTime(
  timestamp: Timestamp | null
): string {
  if (!timestamp) {
    return "Just now";
  }

  const date = timestamp.toDate();
  const difference = Date.now() - date.getTime();

  const minutes = Math.floor(difference / (1000 * 60));
  const hours = Math.floor(difference / (1000 * 60 * 60));
  const days = Math.floor(
    difference / (1000 * 60 * 60 * 24)
  );

  if (minutes < 1) {
    return "Just now";
  }

  if (minutes < 60) {
    return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  }

  if (hours < 24) {
    return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  }

  if (days < 7) {
    return `${days} day${days === 1 ? "" : "s"} ago`;
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}

export default function NotificationCenter({
  user,
}: NotificationCenterProps) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<
    NotificationItem[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [markingAllRead, setMarkingAllRead] =
    useState(false);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    const notificationsQuery = query(
      collection(db, "notifications"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc"),
      limit(20)
    );

    const unsubscribe = onSnapshot(
      notificationsQuery,
      (snapshot) => {
        const loadedNotifications: NotificationItem[] =
          snapshot.docs.map((notificationDocument) => {
            const data = notificationDocument.data();

            return {
              id: notificationDocument.id,
              userId: String(data.userId ?? ""),
              title: String(data.title ?? "Notification"),
              message: String(data.message ?? ""),
              type: [
                "order",
                "deposit",
                "premium",
                "referral",
                "general",
              ].includes(String(data.type))
                ? (String(data.type) as NotificationType)
                : "general",
              read: Boolean(data.read),
              createdAt:
                data.createdAt instanceof Timestamp
                  ? data.createdAt
                  : null,
              link:
                typeof data.link === "string"
                  ? data.link
                  : undefined,
            };
          });

        setNotifications(loadedNotifications);
        setLoading(false);
      },
      (error) => {
        console.error(
          "Notifications listener error:",
          error
        );
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [user]);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(
          event.target as Node
        )
      ) {
        setOpen(false);
      }
    }

    document.addEventListener(
      "mousedown",
      handleOutsideClick
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleOutsideClick
      );
    };
  }, []);

  const unreadCount = useMemo(
    () =>
      notifications.filter(
        (notification) => !notification.read
      ).length,
    [notifications]
  );

  async function markAsRead(notificationId: string) {
    try {
      await updateDoc(
        doc(db, "notifications", notificationId),
        {
          read: true,
          readAt: Timestamp.now(),
        }
      );
    } catch (error) {
      console.error(
        "Notification mark as read error:",
        error
      );
    }
  }

  async function markAllAsRead() {
    const unreadNotifications = notifications.filter(
      (notification) => !notification.read
    );

    if (unreadNotifications.length === 0) {
      return;
    }

    try {
      setMarkingAllRead(true);

      const batch = writeBatch(db);
      const readAt = Timestamp.now();

      unreadNotifications.forEach((notification) => {
        batch.update(
          doc(db, "notifications", notification.id),
          {
            read: true,
            readAt,
          }
        );
      });

      await batch.commit();
    } catch (error) {
      console.error(
        "Mark all notifications error:",
        error
      );
    } finally {
      setMarkingAllRead(false);
    }
  }

  function handleNotificationClick(
    notification: NotificationItem
  ) {
    if (!notification.read) {
      void markAsRead(notification.id);
    }

    setOpen(false);

    if (notification.link) {
      router.push(notification.link);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="relative flex h-11 w-11 items-center justify-center rounded-xl border border-gray-200 bg-white text-xl transition hover:bg-gray-50"
        aria-label={`Open notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
        title={unreadCount > 0 ? `${unreadCount} unread notifications` : "Notifications"}
      >
        🔔

        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 animate-pulse items-center justify-center rounded-full bg-red-600 px-1 text-xs font-bold text-white ring-2 ring-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-14 z-50 w-[340px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl sm:w-[400px]">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <div>
              <h3 className="font-bold text-gray-900">
                Notifications
              </h3>

              <p className="text-xs text-gray-500">
                {unreadCount} unread notification
                {unreadCount === 1 ? "" : "s"}
              </p>
            </div>

            <button
              type="button"
              onClick={markAllAsRead}
              disabled={
                unreadCount === 0 || markingAllRead
              }
              className="text-xs font-semibold text-blue-700 hover:underline disabled:cursor-not-allowed disabled:text-gray-400"
            >
              {markingAllRead
                ? "Updating..."
                : "Mark all read"}
            </button>
          </div>

          <div className="max-h-[420px] overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center text-sm text-gray-500">
                Notifications loading...
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-10 text-center">
                <div className="text-4xl">🔔</div>

                <p className="mt-3 font-semibold text-gray-800">
                  No notifications
                </p>

                <p className="mt-1 text-sm text-gray-500">
                  New updates yahan show hongi.
                </p>
              </div>
            ) : (
              notifications.map((notification) => (
                <button
                  key={notification.id}
                  type="button"
                  onClick={() =>
                    handleNotificationClick(
                      notification
                    )
                  }
                  className={`flex w-full gap-3 border-b border-gray-100 px-5 py-4 text-left transition last:border-b-0 hover:bg-gray-50 ${
                    notification.read
                      ? "bg-white"
                      : "bg-blue-50"
                  }`}
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-xl shadow-sm">
                    {getNotificationIcon(
                      notification.type
                    )}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="flex items-start justify-between gap-3">
                      <span className="font-semibold text-gray-900">
                        {notification.title}
                      </span>

                      {!notification.read && (
                        <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-blue-600" />
                      )}
                    </span>

                    <span className="mt-1 block text-sm leading-5 text-gray-600">
                      {notification.message}
                    </span>

                    <span className="mt-2 block text-xs text-gray-400">
                      {formatNotificationTime(
                        notification.createdAt
                      )}
                    </span>
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}