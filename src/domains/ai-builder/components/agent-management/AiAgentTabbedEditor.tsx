'use client';

import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, FileText, Code, Route, ArrowRight, Layout } from 'lucide-react';
import { AiAgent } from '../../types';
import { GeneralInfoTab } from './tabs/GeneralInfoTab';
import { SystemPromptTab } from './tabs/SystemPromptTab';
import { RenderComponentsTab } from './tabs/RenderComponentsTab';
import { PreloadRoutesTab } from './tabs/PreloadRoutesTab';
import { NextActionTab } from './tabs/NextActionTab';
import { ResponseCardsTab } from './tabs/ResponseCardsTab';
import { MainLayout } from '@/components/layout/main-layout';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { MessageBox } from '@/gradian-ui/layout/message-box';
import { AiAgentDeleteConfirmDialog } from './AiAgentDeleteConfirmDialog';
import { ConfirmationMessage } from '@/gradian-ui/form-builder';
import { toast } from 'sonner';
import { Save, RotateCcw, RefreshCw, Trash2 } from 'lucide-react';
import { useBackIcon } from '@/gradian-ui/shared/hooks';
import { AiAgentNotFound } from '../AiAgentNotFound';
import { useRouter } from 'next/navigation';
import { loggingCustom } from '@/gradian-ui/shared/utils/logging-custom';
import { LogType } from '@/gradian-ui/shared/configs/log-config';

interface AiAgentTabbedEditorProps {
  agentId: string;
  fetchAgent: (id: string) => Promise<AiAgent>;
  saveAgent: (id: string, agent: AiAgent) => Promise<void>;
  deleteAgent: (id: string) => Promise<void>;
  onBack?: () => void;
}

export function AiAgentTabbedEditor({
  agentId,
  fetchAgent,
  saveAgent,
  deleteAgent,
  onBack,
}: AiAgentTabbedEditorProps) {
  const router = useRouter();
  const BackIcon = useBackIcon();
  const [agent, setAgent] = useState<AiAgent | null>(null);
  const [originalAgent, setOriginalAgent] = useState<AiAgent | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [apiResponse, setApiResponse] = useState<any>(null);
  const [showResetDialog, setShowResetDialog] = useState(false);

  useEffect(() => {
    if (agentId) {
      loadAgent(agentId);
    }
  }, [agentId]);

  const loadAgent = async (id: string) => {
    try {
      setLoading(true);
      setApiResponse(null);
      const data = await fetchAgent(id);
      setAgent(data);
      setOriginalAgent(JSON.parse(JSON.stringify(data)));
    } catch (error) {
      loggingCustom(LogType.CLIENT_LOG, 'error', `Error loading agent: ${error instanceof Error ? error.message : String(error)}`);
      setAgent(null);
      setOriginalAgent(null);
      setApiResponse({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to load AI agent',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!agent || !agentId) return;

    try {
      setSaving(true);
      setApiResponse(null);
      await saveAgent(agentId, agent);
      setOriginalAgent(JSON.parse(JSON.stringify(agent)));
      toast.success('AI agent saved successfully');
      setApiResponse({
        success: true,
        message: 'AI agent saved successfully',
      });
    } catch (error) {
      loggingCustom(LogType.CLIENT_LOG, 'error', `Error saving agent: ${error instanceof Error ? error.message : String(error)}`);
      const errorMessage = error instanceof Error ? error.message : 'Failed to save AI agent';
      toast.error(errorMessage);
      setApiResponse({
        success: false,
        error: errorMessage,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!agentId) return;

    try {
      await deleteAgent(agentId);
      toast.success('AI agent deleted successfully');
      if (onBack) onBack();
    } catch (error) {
      loggingCustom(LogType.CLIENT_LOG, 'error', `Error deleting agent: ${error instanceof Error ? error.message : String(error)}`);
      toast.error(error instanceof Error ? error.message : 'Failed to delete AI agent');
    }
  };

  const handleReset = () => {
    if (!originalAgent) return;
    setAgent(JSON.parse(JSON.stringify(originalAgent)));
    setShowResetDialog(false);
  };

  const updateAgent = (updates: Partial<AiAgent>) => {
    setAgent(prev => prev ? { ...prev, ...updates } : null);
  };

  const hasChanges = JSON.stringify(agent) !== JSON.stringify(originalAgent);

  if (loading) {
    return (
      <MainLayout title="Loading..." icon="Bot" subtitle="AI Agent Editor">
        <div className="space-y-6">
          <div className="flex items-center justify-between gap-4">
            <Skeleton className="h-9 w-24 rounded-md" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-9 w-20 rounded-md" />
              <Skeleton className="h-9 w-20 rounded-md" />
              <Skeleton className="h-9 w-24 rounded-md" />
            </div>
          </div>
          <div className="space-y-4">
            <div className="grid w-full grid-cols-2 sm:grid-cols-6 gap-2 rounded-xl border border-gray-200 bg-gray-50 p-1 dark:border-slate-800 dark:bg-slate-900/40">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className="h-10 w-full rounded-lg" />
              ))}
            </div>
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-48 rounded-md" />
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-10 w-full rounded-md" />
                <Skeleton className="h-20 w-full rounded-md" />
              </CardContent>
            </Card>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!agent) {
    return (
      <MainLayout title="Agent Not Found" icon="Bot" subtitle="AI Agent Editor" showEndLine={false}>
        <AiAgentNotFound
          onGoBack={onBack || (() => router.push('/builder/ai-agents'))}
          showGoBackButton
          showHomeButton
          homeHref="/builder/ai-agents"
        />
      </MainLayout>
    );
  }

  return (
    <MainLayout 
      title={agent.label || agent.id} 
      icon="Bot" 
      subtitle="AI Agent Editor">
      <div className="space-y-6">
        {apiResponse && (apiResponse.message || apiResponse.error) && (
          <MessageBox
            message={apiResponse.message || apiResponse.error}
            variant={apiResponse.success ? 'success' : 'error'}
            dismissible
            onDismiss={() => setApiResponse(null)}
          />
        )}

        <div className="flex items-center justify-between gap-2 flex-wrap">
          {onBack && (
            <Button variant="ghost" onClick={onBack}>
              <BackIcon className="h-4 w-4 md:me-2" />
              <span className="hidden md:inline">Back to AI Agents</span>
            </Button>
          )}
          <div className="flex gap-2 ms-auto flex-wrap">
            <Button
              variant="outline"
              onClick={() => loadAgent(agentId)}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 md:me-2 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden md:inline">Refresh</span>
            </Button>
            {hasChanges && (
              <Button variant="outline" onClick={() => setShowResetDialog(true)}>
                <RotateCcw className="h-4 w-4 md:me-2" />
                <span className="hidden md:inline">Reset</span>
              </Button>
            )}
            <Button
              variant="destructive"
              onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash2 className="h-4 w-4 md:me-2" />
              <span className="hidden md:inline">Delete</span>
            </Button>
            <Button onClick={handleSave} disabled={saving || !hasChanges}>
              {saving ? (
                <RefreshCw className="h-4 w-4 md:me-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 md:me-2" />
              )}
              <span className="hidden md:inline">{saving ? 'Saving...' : 'Save Changes'}</span>
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 h-auto gap-2 rounded-xl border border-gray-200 bg-gray-50 p-1 dark:border-slate-800 dark:bg-slate-900/40 select-none">
            <TabsTrigger
              value="general"
              className="text-xs sm:text-sm rounded-lg py-2 px-3 text-gray-600 transition-colors data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm dark:text-slate-300 dark:data-[state=active]:bg-slate-800 dark:data-[state=active]:text-white"
            >
              <Settings className="h-4 w-4 me-1 sm:me-2" />
              <span className="truncate">General</span>
            </TabsTrigger>
            <TabsTrigger
              value="system-prompt"
              className="text-xs sm:text-sm rounded-lg py-2 px-3 text-gray-600 transition-colors data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm dark:text-slate-300 dark:data-[state=active]:bg-slate-800 dark:data-[state=active]:text-white"
            >
              <FileText className="h-4 w-4 me-1 sm:me-2" />
              <span className="truncate hidden sm:inline">System Prompt</span>
              <span className="truncate sm:hidden">Prompt</span>
            </TabsTrigger>
            <TabsTrigger
              value="components"
              className="text-xs sm:text-sm rounded-lg py-2 px-3 text-gray-600 transition-colors data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm dark:text-slate-300 dark:data-[state=active]:bg-slate-800 dark:data-[state=active]:text-white"
            >
              <Code className="h-4 w-4 me-1 sm:me-2" />
              <span className="truncate">Components</span>
            </TabsTrigger>
            <TabsTrigger
              value="routes"
              className="text-xs sm:text-sm rounded-lg py-2 px-3 text-gray-600 transition-colors data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm dark:text-slate-300 dark:data-[state=active]:bg-slate-800 dark:data-[state=active]:text-white"
            >
              <Route className="h-4 w-4 me-1 sm:me-2" />
              <span className="truncate">Routes</span>
            </TabsTrigger>
            <TabsTrigger
              value="next-action"
              className="text-xs sm:text-sm rounded-lg py-2 px-3 text-gray-600 transition-colors data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm dark:text-slate-300 dark:data-[state=active]:bg-slate-800 dark:data-[state=active]:text-white"
            >
              <ArrowRight className="h-4 w-4 me-1 sm:me-2" />
              <span className="truncate hidden sm:inline">Next Action</span>
              <span className="truncate sm:hidden">Action</span>
            </TabsTrigger>
            <TabsTrigger
              value="response-cards"
              className="text-xs sm:text-sm rounded-lg py-2 px-3 text-gray-600 transition-colors data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm dark:text-slate-300 dark:data-[state=active]:bg-slate-800 dark:data-[state=active]:text-white"
            >
              <Layout className="h-4 w-4 me-1 sm:me-2" />
              <span className="truncate hidden sm:inline">Response Cards</span>
              <span className="truncate sm:hidden">Cards</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-4 mt-4">
            <GeneralInfoTab agent={agent} onUpdate={updateAgent} />
          </TabsContent>

          <TabsContent value="system-prompt" className="space-y-4 mt-4">
            <SystemPromptTab agent={agent} onUpdate={updateAgent} />
          </TabsContent>

          <TabsContent value="components" className="space-y-4 mt-4">
            <RenderComponentsTab agent={agent} onUpdate={updateAgent} />
          </TabsContent>

          <TabsContent value="routes" className="space-y-4 mt-4">
            <PreloadRoutesTab agent={agent} onUpdate={updateAgent} />
          </TabsContent>

          <TabsContent value="next-action" className="space-y-4 mt-4">
            <NextActionTab agent={agent} onUpdate={updateAgent} />
          </TabsContent>

          <TabsContent value="response-cards" className="space-y-4 mt-4">
            <ResponseCardsTab agent={agent} onUpdate={updateAgent} />
          </TabsContent>
        </Tabs>
      </div>

      <AiAgentDeleteConfirmDialog
        isOpen={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        agentName={agent.label || agent.id}
        onConfirm={handleDelete}
      />

      <ConfirmationMessage
        isOpen={showResetDialog}
        onOpenChange={setShowResetDialog}
        title={[{ en: 'Reset Changes' }, { fa: 'بازنشانی تغییرات' }, { ar: 'إعادة تعيين التغييرات' }, { es: 'Restablecer cambios' }, { fr: 'Réinitialiser les modifications' }, { de: 'Änderungen zurücksetzen' }, { it: 'Reimposta modifiche' }, { ru: 'Сбросить изменения' }]}
        message={[{ en: 'Are you sure you want to reset all changes? This will discard all unsaved modifications and restore the agent to its last saved state.' }, { fa: 'آیا مطمئن هستید که می‌خواهید همه تغییرات را بازنشانی کنید؟ تمام تغییرات ذخیره‌نشده حذف شده و عامل به آخرین حالت ذخیره شده برمی‌گردد.' }, { ar: 'هل أنت متأكد أنك تريد إعادة تعيين جميع التغييرات؟ سيتم تجاهل جميع التعديلات غير المحفوظة واستعادة الوكيل إلى آخر حالة محفوظة.' }, { es: '¿Está seguro de que desea restablecer todos los cambios? Se descartarán todas las modificaciones no guardadas y se restaurará el agente a su último estado guardado.' }, { fr: 'Voulez-vous vraiment réinitialiser toutes les modifications ? Toutes les modifications non enregistrées seront annulées et l\'agent sera restauré à son dernier état enregistré.' }, { de: 'Möchten Sie wirklich alle Änderungen zurücksetzen? Alle ungespeicherten Änderungen werden verworfen und der Agent wird auf den zuletzt gespeicherten Zustand zurückgesetzt.' }, { it: 'Sei sicuro di voler reimpostare tutte le modifiche? Verranno scartate tutte le modifiche non salvate e l\'agente verrà ripristinato all\'ultimo stato salvato.' }, { ru: 'Вы уверены, что хотите сбросить все изменения? Все несохранённые изменения будут отменены, агент вернётся к последнему сохранённому состоянию.' }]}
        variant="warning"
        buttons={[
          {
            label: 'Cancel',
            variant: 'outline',
            action: () => setShowResetDialog(false),
          },
          {
            label: 'Reset Changes',
            variant: 'destructive',
            action: handleReset,
          },
        ]}
      />
    </MainLayout>
  );
}

