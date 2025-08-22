import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface NotificationPayload {
  user_id: string;
  title: string;
  message: string;
  type?: 'message' | 'session' | 'workout' | 'meal_assignment' | 'meal_plan' | 'general';
  data?: Record<string, any>;
}

export interface NotificationResponse {
  success: boolean;
  notification_id?: string;
  recipients?: number;
  error?: string;
}

class NotificationService {
  private apiUrl: string;

  constructor() {
    // Use your deployed API route URL
    this.apiUrl = process.env.NEXT_PUBLIC_API_URL 
      ? `${process.env.NEXT_PUBLIC_API_URL}/api/notifications/push`
      : '/api/notifications/push';
  }

  /**
   * Send a push notification to a specific user
   */
  async sendNotification(payload: NotificationPayload): Promise<NotificationResponse> {
    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send notification');
      }

      return data;
    } catch (error) {
      console.error('Error sending notification:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Send notifications to multiple users
   */
  async sendBatchNotifications(notifications: NotificationPayload[]): Promise<NotificationResponse[]> {
    const results = await Promise.allSettled(
      notifications.map(notification => this.sendNotification(notification))
    );

    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          success: false,
          error: result.reason?.message || 'Failed to send notification',
        };
      }
    });
  }

  /**
   * Send a message notification
   */
  async sendMessageNotification(
    receiverId: string,
    senderName: string,
    messagePreview?: string,
    messageId?: string
  ): Promise<NotificationResponse> {
    return this.sendNotification({
      user_id: receiverId,
      title: 'New Message',
      message: `${senderName} sent you a message${messagePreview ? ': ' + messagePreview.substring(0, 50) : ''}`,
      type: 'message',
      data: {
        message_id: messageId,
        sender_name: senderName,
      },
    });
  }

  /**
   * Send a session notification
   */
  async sendSessionNotification(
    clientId: string,
    sessionType: string,
    scheduledAt: string,
    isUpdate: boolean = false
  ): Promise<NotificationResponse> {
    return this.sendNotification({
      user_id: clientId,
      title: isUpdate ? 'Session Updated' : 'New Session Scheduled',
      message: `Your ${sessionType} has been ${isUpdate ? 'updated' : 'scheduled'} for ${new Date(scheduledAt).toLocaleString()}`,
      type: 'session',
      data: {
        session_type: sessionType,
        scheduled_at: scheduledAt,
      },
    });
  }

  /**
   * Send a workout notification
   */
  async sendWorkoutNotification(
    userId: string,
    workoutDay: string,
    workoutId?: string,
    category?: string
  ): Promise<NotificationResponse> {
    return this.sendNotification({
      user_id: userId,
      title: 'New Workout Assignment',
      message: `You have a new workout scheduled for ${workoutDay}${category ? ' - ' + category : ''}`,
      type: 'workout',
      data: {
        workout_id: workoutId,
        day: workoutDay,
        category: category,
      },
    });
  }

  /**
   * Send a meal plan notification
   */
  async sendMealPlanNotification(
    clientId: string,
    mealPlanName?: string,
    mealPlanId?: string
  ): Promise<NotificationResponse> {
    return this.sendNotification({
      user_id: clientId,
      title: 'New Meal Plan',
      message: `A new meal plan${mealPlanName ? ' "' + mealPlanName + '"' : ''} has been assigned to you`,
      type: 'meal_plan',
      data: {
        meal_plan_id: mealPlanId,
        meal_plan_name: mealPlanName,
      },
    });
  }

  /**
   * Get user's notification history from Supabase
   */
  async getNotificationHistory(userId: string, limit: number = 50) {
    try {
      const { data, error } = await supabase
        .from('notificationz')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching notification history:', error);
      return [];
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string) {
    try {
      const { error } = await supabase
        .from('notificationz')
        .update({ read: true })
        .eq('id', notificationId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return false;
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string) {
    try {
      const { error } = await supabase
        .from('notificationz')
        .update({ read: true })
        .eq('user_id', userId)
        .eq('read', false);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      return false;
    }
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(userId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('notificationz')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('read', false);

      if (error) throw error;
      return count || 0;
    } catch (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }
  }
}

// Export singleton instance
export const notificationService = new NotificationService();