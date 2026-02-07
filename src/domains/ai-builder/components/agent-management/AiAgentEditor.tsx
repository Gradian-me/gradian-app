'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Save, RefreshCw, Trash2 } from 'lucide-react';
import { useBackIcon } from '@/gradian-ui/shared/hooks';
import { MainLayout } from '@/components/layout/main-layout';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { MessageBox } from '@/gradian-ui/layout/message-box';
import { AiAgent } from '../../types';
import { AiAgentDeleteConfirmDialog } from './AiAgentDeleteConfirmDialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { AiAgentNotFound } from '../AiAgentNotFound';
import { loggingCustom } from '@/gradian-ui/shared/utils/logging-custom';
import { LogType } from '@/gradian-ui/shared/configs/log-config';

interface AiAgentEditorProps {
  agentId: string;
  fetchAgent: (id: string) => Promise<AiAgent>;
  saveAgent: (id: string, agent: AiAgent) => Promise<void>;
  deleteAgent: (id: string) => Promise<void>;
  onBack?: () => void;
}

export function AiAgentEditor({
  agentId,
  fetchAgent,
  saveAgent,
  deleteAgent,
  onBack,
}: AiAgentEditorProps) {
  const router = useRouter();
  const BackIcon = useBackIcon();
  const [agent, setAgent] = useState<AiAgent | null>(null);
  const [originalAgent, setOriginalAgent] = useState<AiAgent | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [jsonValue, setJsonValue] = useState('');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [apiResponse, setApiResponse] = useState<any>(null);

  useEffect(() => {
    if (agentId) {
      loadAgent(agentId);
    }
  }, [agentId]);

  const loadAgent = async (id: string) => {
    try {
      setLoading(true);
      setJsonError(null);
      setApiResponse(null);
      const data = await fetchAgent(id);
      setAgent(data);
      setOriginalAgent(JSON.parse(JSON.stringify(data)));
      setJsonValue(JSON.stringify(data, null, 2));
    } catch (error) {
      loggingCustom(LogType.CLIENT_LOG, 'error', `Error loading agent: ${error instanceof Error ? error.message : String(error)}`);
      setAgent(null);
      setOriginalAgent(null);
      setJsonValue('');
      setApiResponse({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to load AI agent',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleJsonChange = (value: string) => {
    setJsonValue(value);
    setJsonError(null);
    
    try {
      const parsed = JSON.parse(value);
      setAgent(parsed as AiAgent);
    } catch (error) {
      setJsonError('Invalid JSON format');
    }
  };

  const handleSave = async () => {
    if (!agent || !agentId) return;

    try {
      setSaving(true);
      setJsonError(null);
      setApiResponse(null);

      // Validate JSON before saving
      try {
        JSON.parse(jsonValue);
      } catch (error) {
        setJsonError('Invalid JSON format. Please fix errors before saving.');
        setSaving(false);
        return;
      }

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
      router.push('/builder/ai-agents');
    } catch (error) {
      loggingCustom(LogType.CLIENT_LOG, 'error', `Error deleting agent: ${error instanceof Error ? error.message : String(error)}`);
      toast.error(error instanceof Error ? error.message : 'Failed to delete AI agent');
    }
  };

  const handleReset = () => {
    if (!originalAgent) return;
    setAgent(JSON.parse(JSON.stringify(originalAgent)));
    setJsonValue(JSON.stringify(originalAgent, null, 2));
    setJsonError(null);
  };

  const hasChanges = JSON.stringify(agent) !== JSON.stringify(originalAgent);

  if (loading) {
    return (
      <MainLayout title="Loading..." icon="Bot" subtitle="AI Agent Editor">
        <div className="space-y-4">
          <Skeleton className="h-96 w-full" />
        </div>
      </MainLayout>
    );
  }

  if (!agent) {
    return (
      <MainLayout title="Agent Not Found" icon="Bot" subtitle="AI Agent Editor" showEndLine={false}>
        <AiAgentNotFound
          onGoBack={() => router.push('/builder/ai-agents')}
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

        <div className="flex items-center justify-between gap-2">
          <Button variant="outline" onClick={onBack || (() => router.push('/builder/ai-agents'))}>
            <BackIcon className="h-4 w-4 me-2" />
            Back to AI Agents
          </Button>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadAgent(agentId)}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 me-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            {hasChanges && (
              <Button variant="outline" size="sm" onClick={handleReset}>
                Reset Changes
              </Button>
            )}
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash2 className="h-4 w-4 me-2" />
              Delete
            </Button>
            <Button onClick={handleSave} disabled={saving || !!jsonError || !hasChanges}>
              <Save className="h-4 w-4 me-2" />
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Agent Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="agent-json">JSON Configuration</Label>
                {jsonError && (
                  <span className="text-sm text-red-600 dark:text-red-400">{jsonError}</span>
                )}
              </div>
              <Textarea
                id="agent-json"
                value={jsonValue}
                onChange={(e) => handleJsonChange(e.target.value)}
                className="font-mono text-sm min-h-[600px]"
                placeholder="Enter JSON configuration..."
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Edit the JSON configuration directly. Changes are validated in real-time.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <AiAgentDeleteConfirmDialog
        isOpen={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        agentName={agent.label || agent.id}
        onConfirm={handleDelete}
      />
    </MainLayout>
  );
}

