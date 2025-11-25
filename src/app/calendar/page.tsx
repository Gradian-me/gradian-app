'use client';

import { useEffect, useState } from 'react';
import { MainLayout } from '@/components/layout/main-layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { KPIList } from '@/gradian-ui/analytics/indicators/kpi-list';
import { 
  Calendar, 
  Clock, 
  FileText, 
  AlertCircle,
  CheckCircle,
  Plus
} from 'lucide-react';
import { motion } from 'framer-motion';

interface CalendarEvent {
  id: string;
  title: string;
  type: 'tender' | 'delivery' | 'deadline' | 'meeting';
  date: Date;
  status: 'upcoming' | 'today' | 'overdue' | 'completed';
  description?: string;
  priority: 'low' | 'medium' | 'high';
}

export default function CalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [overdueKpi, setOverdueKpi] = useState<any[]>([]);
  const [todayKpi, setTodayKpi] = useState<any[]>([]);
  const [upcomingKpi, setUpcomingKpi] = useState<any[]>([]);
  const [completedKpi, setCompletedKpi] = useState<any[]>([]);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        // Fetch unified KPI lists for calendar events
        const [overdueData, todayData, upcomingData, completedData] = await Promise.all([
          fetch('/api/dashboard/kpi-lists?type=overdue_events').then(res => res.json()),
          fetch('/api/dashboard/kpi-lists?type=today_events').then(res => res.json()),
          fetch('/api/dashboard/kpi-lists?type=upcoming_events').then(res => res.json()),
          fetch('/api/dashboard/kpi-lists?type=recently_completed').then(res => res.json())
        ]);

        if (overdueData.success) setOverdueKpi(overdueData.data);
        if (todayData.success) setTodayKpi(todayData.data);
        if (upcomingData.success) setUpcomingKpi(upcomingData.data);
        if (completedData.success) setCompletedKpi(completedData.data);

        // Transform KPI data to CalendarEvent format for backward compatibility
        const allKpiItems = [
          ...overdueData.data || [],
          ...todayData.data || [],
          ...upcomingData.data || [],
          ...completedData.data || []
        ];

        const transformedEvents: CalendarEvent[] = allKpiItems.map((item: any) => {
          let eventType: 'tender' | 'delivery' | 'deadline' | 'meeting' = 'meeting';
          if (item.metadata?.eventType) {
            const type = item.metadata.eventType;
            if (type === 'tender') eventType = 'tender';
            else if (type === 'delivery') eventType = 'delivery';
            else if (type === 'deadline') eventType = 'deadline';
            else if (type === 'meeting') eventType = 'meeting';
          }

          let status: 'upcoming' | 'today' | 'overdue' | 'completed' = 'upcoming';
          if (item.type === 'overdue_events') status = 'overdue';
          else if (item.type === 'today_events') status = 'today';
          else if (item.type === 'recently_completed') status = 'completed';
          else status = 'upcoming';

          let priority: 'low' | 'medium' | 'high' = 'medium';
          if (item.metadata?.priority) {
            priority = item.metadata.priority as 'low' | 'medium' | 'high';
          }

          return {
            id: item.id,
            title: item.title,
            type: eventType,
            date: new Date(item.timestamp),
            status: status,
            description: item.subtitle,
            priority: priority,
          };
        });

        setEvents(transformedEvents);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching events:', error);
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  const getEventTypeIcon = (type: string) => {
    switch (type) {
      case 'tender': return FileText;
      case 'delivery': return Calendar;
      case 'deadline': return Clock;
      case 'meeting': return Calendar;
      default: return Calendar;
    }
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'upcoming': return 'blue';
      case 'today': return 'amber';
      case 'overdue': return 'red';
      case 'completed': return 'green';
      default: return 'gray';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'upcoming': return Clock;
      case 'today': return AlertCircle;
      case 'overdue': return AlertCircle;
      case 'completed': return CheckCircle;
      default: return Clock;
    }
  };

  const getPriorityColor = (priority: string): string => {
    switch (priority) {
      case 'high': return 'red';
      case 'medium': return 'amber';
      case 'low': return 'green';
      default: return 'gray';
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    }).format(new Date(date));
  };

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date));
  };

  const getDaysUntilEvent = (date: Date) => {
    const now = new Date();
    const eventDate = new Date(date);
    const diffTime = eventDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'Overdue';
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    return `${diffDays} days`;
  };

  // Use KPI data directly instead of filtering events
  const upcomingEvents = upcomingKpi;
  const todayEvents = todayKpi;
  const overdueEvents = overdueKpi;
  const completedEvents = completedKpi;

  if (loading) {
    return (
      <MainLayout title="Tender Calendar">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Tender Calendar">
      <div className="space-y-6">
        {/* Calendar Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between md:items-center"
        >
          <div className="text-center sm:text-left space-y-1">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Tender Calendar</h2>
            <p className="text-gray-600 dark:text-gray-400">Track important dates and deadlines</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Button variant="outline" className="w-full sm:w-auto justify-center">
              <Calendar className="h-4 w-4 mr-2" />
              View Calendar
            </Button>
            <Button className="w-full sm:w-auto justify-center">
              <Plus className="h-4 w-4 mr-2" />
              Add Event
            </Button>
          </div>
        </motion.div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="h-5 w-5 text-red-500" />
                  <div>
                    <div className="text-2xl font-bold text-red-500">{overdueEvents.length}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Overdue</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Clock className="h-5 w-5 text-yellow-500" />
                  <div>
                    <div className="text-2xl font-bold text-yellow-500">{todayEvents.length}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Today</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.3 }}
          >
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-5 w-5 text-blue-500" />
                  <div>
                    <div className="text-2xl font-bold text-blue-500">{upcomingEvents.length}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Upcoming</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.4 }}
          >
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <div>
                    <div className="text-2xl font-bold text-green-500">{completedEvents.length}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Completed</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Events by Status */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Overdue Events */}
          {overdueEvents.length > 0 && (
            <KPIList
              title="Overdue Events"
              icon="AlertCircle"
              items={overdueEvents.map((item) => ({
                title: item.title,
                subtitle: item.subtitle,
                color: item.color,
                progress: item.progress,
                status: item.status,
                url: item.url,
              }))}
            />
          )}

          {/* Today's Events */}
          {todayEvents.length > 0 && (
            <KPIList
              title="Today's Events"
              icon="Clock"
              items={todayEvents.map((item) => ({
                title: item.title,
                subtitle: item.subtitle,
                color: item.color,
                progress: item.progress,
                status: item.status,
                url: item.url,
              }))}
            />
          )}

          {/* Upcoming Events */}
          <KPIList
            title="Upcoming Events"
            icon="Calendar"
            items={upcomingEvents.map((item) => ({
              title: item.title,
              subtitle: item.subtitle,
              color: item.color,
              progress: item.progress,
              status: item.status,
              url: item.url,
            }))}
          />

          {/* Recent Completed Events */}
          <KPIList
            title="Recently Completed"
            icon="CheckCircle"
            items={completedEvents.map((item) => ({
              title: item.title,
              subtitle: item.subtitle,
              color: item.color,
              progress: item.progress,
              status: item.status,
              url: item.url,
            }))}
          />
        </div>
      </div>
    </MainLayout>
  );
}


