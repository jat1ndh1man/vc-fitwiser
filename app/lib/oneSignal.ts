// app/lib/onesignal.ts

interface OneSignalNotificationData {
  app_id: string;
  include_external_user_ids: string[];
  headings: { en: string };
  contents: { en: string };
  data?: any;
  url?: string;
  android_sound?: string;
  ios_sound?: string;
  ios_badgeType?: string;
  ios_badgeCount?: number;
}

interface OneSignalResponse {
  success: boolean;
  notificationId?: string;
  recipients?: number;
  error?: string;
}

// OneSignal Configuration
const ONESIGNAL_APP_ID = process.env.ONESIGNAL_APP_ID!;
const ONESIGNAL_REST_API_KEY = process.env.ONESIGNAL_REST_API_KEY!;
const ONESIGNAL_API_URL = 'https://onesignal.com/api/v1/notifications';

/**
 * Get deep link URL based on notification type
 */
export function getDeepLinkUrl(type: string): string {
  const baseUrl = 'yourapp://'; // Replace with your app's custom scheme
  
  switch (type) {
    case 'chat':
    case 'message':
      return `${baseUrl}main/chats`;
    case 'workout':
      return `${baseUrl}main/workout`;
    case 'nutrition':
      return `${baseUrl}main/nutrition`;
    default:
      return `${baseUrl}main/home`;
  }
}

/**
 * Send push notification via OneSignal
 */
export async function sendPushNotification(
  userId: string,
  title: string,
  message: string,
  data: any = {},
  type: string = 'general'
): Promise<OneSignalResponse> {
  if (!ONESIGNAL_APP_ID || !ONESIGNAL_REST_API_KEY) {
    throw new Error('OneSignal configuration is missing. Please check your environment variables.');
  }

  try {
    const notificationData: OneSignalNotificationData = {
      app_id: ONESIGNAL_APP_ID,
      include_external_user_ids: [userId],
      headings: { en: title },
      contents: { en: message },
      data: {
        ...data,
        notification_type: type,
        timestamp: new Date().toISOString()
      },
      url: getDeepLinkUrl(type),
      android_sound: 'notification',
      ios_sound: 'notification.wav',
      ios_badgeType: 'Increase',
      ios_badgeCount: 1
    };

    const response = await fetch(ONESIGNAL_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}`
      },
      body: JSON.stringify(notificationData)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`OneSignal API Error: ${JSON.stringify(errorData)}`);
    }

    const responseData = await response.json();

    return {
      success: true,
      notificationId: responseData.id,
      recipients: responseData.recipients
    };
  } catch (error) {
    console.error('OneSignal API Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Get notification stats from OneSignal
 */
export async function getNotificationStats(notificationId: string) {
  try {
    const response = await fetch(
      `https://onesignal.com/api/v1/notifications/${notificationId}?app_id=${ONESIGNAL_APP_ID}`,
      {
        headers: {
          'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}`
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch notification stats: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching notification stats:', error);
    throw error;
  }
}

/**
 * Validate required fields for notifications
 */
export function validateNotificationData(requiredFields: string[], data: any): string | null {
  for (const field of requiredFields) {
    if (!data[field]) {
      return `Missing required field: ${field}`;
    }
  }
  return null;
}