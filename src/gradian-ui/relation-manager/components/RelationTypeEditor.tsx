'use client';

import { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Save, Trash2 } from 'lucide-react';
import { useBackIcon } from '@/gradian-ui/shared/hooks';
import { useRelationManager } from '../hooks/useRelationManager';
import { RelationTypeForm } from './RelationTypeForm';
import { RelationManagerConfig } from '../types';

interface RelationTypeEditorProps {
  relationTypeId: string;
  config?: RelationManagerConfig;
  onBack: () => void;
}

export function RelationTypeEditor({ 
  relationTypeId, 
  config,
  onBack 
}: RelationTypeEditorProps) {
  const BackIcon = useBackIcon();
  const { state, actions } = useRelationManager(config);

  useEffect(() => {
    if (relationTypeId) {
      actions.loadRelationType(relationTypeId).catch(console.error);
    }
  }, [relationTypeId]);

  const handleSave = async () => {
    if (!state.relationType) return;
    
    try {
      await actions.saveRelationType(state.relationType);
      // Show success message or handle as needed
    } catch (error) {
      console.error('Failed to save:', error);
    }
  };

  const handleDelete = async () => {
    if (!state.relationType || !confirm('Are you sure you want to delete this relation type?')) {
      return;
    }
    
    try {
      await actions.deleteRelationType(state.relationType.id);
      onBack();
    } catch (error) {
      console.error('Failed to delete:', error);
    }
  };

  if (state.loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
      </div>
    );
  }

  if (!state.relationType) {
    return (
      <div className="text-center py-20">
        <h3 className="text-xl font-semibold mb-4">Relation Type not found</h3>
        <p className="text-gray-600 mb-6">Please try loading a different relation type.</p>
        <Button onClick={onBack}>
          <BackIcon className="h-4 w-4 me-2" />
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Edit Relation Type</h1>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleDelete}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4 me-2" />
            Delete
          </Button>
          <Button
            variant="outline"
            onClick={onBack}
          >
            <BackIcon className="h-4 w-4 me-2" />
            Back
          </Button>
          <Button
            onClick={handleSave}
            disabled={state.saving}
          >
            {state.saving ? (
              <>
                <Loader2 className="h-4 w-4 me-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 me-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Error Display */}
      {state.error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-600 text-sm">{state.error}</p>
          </CardContent>
        </Card>
      )}

      {/* Form */}
      <RelationTypeForm
        relationType={state.relationType}
        onChange={actions.updateRelationType}
      />
    </div>
  );
}

