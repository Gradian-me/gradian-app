'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';
import { TextInput, Select, ConfirmationMessage } from '@/gradian-ui/form-builder/form-elements';
import { AiAgent } from '../../../types';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

interface ResponseCardsTabProps {
  agent: AiAgent;
  onUpdate: (updates: Partial<AiAgent>) => void;
  readonly?: boolean;
}

export function ResponseCardsTab({ agent, onUpdate, readonly = false }: ResponseCardsTabProps) {
  const responseCards = agent.responseCards || [];
  const [deleteConfirmIndex, setDeleteConfirmIndex] = useState<number | null>(null);

  const addCard = () => {
    const newCard: any = {
      idPath: '$.id',
      labelPath: '$.label',
      iconPath: '$.icon',
      actionType: 'openFormModal',
      schemaPath: '$',
    };
    onUpdate({ responseCards: [...responseCards, newCard] });
  };

  const updateCard = (index: number, updates: any) => {
    const updated = [...responseCards];
    updated[index] = { ...updated[index], ...updates };
    onUpdate({ responseCards: updated });
  };

  const deleteCard = (index: number) => {
    const updated = responseCards.filter((_, i) => i !== index);
    onUpdate({ responseCards: updated.length > 0 ? updated : undefined });
    setDeleteConfirmIndex(null);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Response Cards</CardTitle>
          {!readonly && (
            <Button size="sm" onClick={addCard}>
              <Plus className="h-4 w-4 me-2" />
              Add Card
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {responseCards.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <p>No response cards configured.</p>
            {!readonly && (
              <Button variant="outline" size="sm" onClick={addCard} className="mt-4">
                <Plus className="h-4 w-4 me-2" />
                Add First Card
              </Button>
            )}
          </div>
        ) : (
          <Accordion type="multiple" className="space-y-3">
            {responseCards.map((card, index) => (
              <AccordionItem key={index} value={`card-${index}`} className="border rounded-lg">
                <div className="flex items-center justify-between">
                  <AccordionTrigger className="px-4 flex-1">
                    <span className="font-medium">Response Card {index + 1}</span>
                  </AccordionTrigger>
                  {!readonly && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 me-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteConfirmIndex(index);
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  )}
                </div>
                <AccordionContent className="px-4 pb-4 space-y-4">
                  <div>
                    <TextInput
                      config={{ name: 'idPath', label: 'ID Path (JSON Path)' }}
                      value={card.idPath || ''}
                      onChange={(value) => updateCard(index, { idPath: value })}
                      disabled={readonly}
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">
                      e.g., $.id or $[0].id
                    </p>
                  </div>
                  <div>
                    <TextInput
                      config={{ name: 'labelPath', label: 'Label Path (JSON Path)' }}
                      value={card.labelPath || ''}
                      onChange={(value) => updateCard(index, { labelPath: value })}
                      disabled={readonly}
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">
                      e.g., $.singular_name
                    </p>
                  </div>
                  <div>
                    <TextInput
                      config={{ name: 'iconPath', label: 'Icon Path (JSON Path)' }}
                      value={card.iconPath || ''}
                      onChange={(value) => updateCard(index, { iconPath: value })}
                      disabled={readonly}
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">
                      e.g., $.icon
                    </p>
                  </div>
                  <div>
                    <Select
                      config={{ name: 'actionType', label: 'Action Type' }}
                      options={[
                        { value: 'openFormModal', label: 'Open Form Modal' },
                      ]}
                      value={card.actionType || 'openFormModal'}
                      onValueChange={(value) => updateCard(index, { actionType: value })}
                      disabled={readonly}
                    />
                  </div>
                  <div>
                    <TextInput
                      config={{ name: 'schemaPath', label: 'Schema Path (JSON Path)' }}
                      value={card.schemaPath || ''}
                      onChange={(value) => updateCard(index, { schemaPath: value })}
                      disabled={readonly}
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">
                      e.g., $ or $[0]
                    </p>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}

        <ConfirmationMessage
          isOpen={deleteConfirmIndex !== null}
          onOpenChange={(open) => !open && setDeleteConfirmIndex(null)}
          title={[{ en: 'Delete Response Card' }, { fa: 'حذف کارت پاسخ' }, { ar: 'حذف بطاقة الاستجابة' }, { es: 'Eliminar tarjeta de respuesta' }, { fr: 'Supprimer la carte de réponse' }, { de: 'Antwortkarte löschen' }, { it: 'Elimina scheda risposta' }, { ru: 'Удалить карточку ответа' }]}
          message={[{ en: `Are you sure you want to delete response card ${(deleteConfirmIndex ?? 0) + 1}? This action cannot be undone.` }, { fa: `آیا مطمئن هستید که می‌خواهید کارت پاسخ ${(deleteConfirmIndex ?? 0) + 1} را حذف کنید؟ این عمل قابل بازگشت نیست.` }, { ar: `هل أنت متأكد أنك تريد حذف بطاقة الاستجابة ${(deleteConfirmIndex ?? 0) + 1}؟ لا يمكن التراجع عن هذا الإجراء.` }, { es: `¿Está seguro de que desea eliminar la tarjeta de respuesta ${(deleteConfirmIndex ?? 0) + 1}? Esta acción no se puede deshacer.` }, { fr: `Voulez-vous vraiment supprimer la carte de réponse ${(deleteConfirmIndex ?? 0) + 1} ? Cette action est irréversible.` }, { de: `Möchten Sie die Antwortkarte ${(deleteConfirmIndex ?? 0) + 1} wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.` }, { it: `Sei sicuro di voler eliminare la scheda risposta ${(deleteConfirmIndex ?? 0) + 1}? Questa azione non può essere annullata.` }, { ru: `Вы уверены, что хотите удалить карточку ответа ${(deleteConfirmIndex ?? 0) + 1}? Это действие нельзя отменить.` }]}
          variant="warning"
          buttons={[
            {
              label: 'Cancel',
              variant: 'outline',
              action: () => setDeleteConfirmIndex(null),
            },
            {
              label: 'Delete',
              variant: 'destructive',
              action: () => deleteConfirmIndex !== null && deleteCard(deleteConfirmIndex),
            },
          ]}
        />
      </CardContent>
    </Card>
  );
}

