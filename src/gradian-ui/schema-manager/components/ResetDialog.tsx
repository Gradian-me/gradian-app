'use client';

import { ConfirmationMessage } from '@/gradian-ui/form-builder';

interface ResetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export function ResetDialog({ open, onOpenChange, onConfirm }: ResetDialogProps) {
  return (
    <ConfirmationMessage
      isOpen={open}
      onOpenChange={onOpenChange}
      title={[{ en: 'Reset Changes' }, { fa: 'بازنشانی تغییرات' }, { ar: 'إعادة تعيين التغييرات' }, { es: 'Restablecer cambios' }, { fr: 'Réinitialiser les modifications' }, { de: 'Änderungen zurücksetzen' }, { it: 'Reimposta modifiche' }, { ru: 'Сбросить изменения' }]}
      message={[{ en: 'Are you sure you want to reset all changes? This will discard all unsaved modifications and restore the schema to its last saved state.' }, { fa: 'آیا مطمئن هستید که می‌خواهید همه تغییرات را بازنشانی کنید؟ تمام تغییرات ذخیره‌نشده حذف شده و طرح به آخرین حالت ذخیره شده برمی‌گردد.' }, { ar: 'هل أنت متأكد أنك تريد إعادة تعيين جميع التغييرات؟ سيتم تجاهل جميع التعديلات غير المحفوظة واستعادة المخطط إلى آخر حالة محفوظة.' }, { es: '¿Está seguro de que desea restablecer todos los cambios? Se descartarán todas las modificaciones no guardadas y se restaurará el esquema a su último estado guardado.' }, { fr: 'Voulez-vous vraiment réinitialiser toutes les modifications ? Toutes les modifications non enregistrées seront annulées et le schéma sera restauré à son dernier état enregistré.' }, { de: 'Möchten Sie wirklich alle Änderungen zurücksetzen? Alle ungespeicherten Änderungen werden verworfen und das Schema wird auf den zuletzt gespeicherten Zustand zurückgesetzt.' }, { it: 'Sei sicuro di voler reimpostare tutte le modifiche? Verranno scartate tutte le modifiche non salvate e lo schema verrà ripristinato all\'ultimo stato salvato.' }, { ru: 'Вы уверены, что хотите сбросить все изменения? Все несохранённые изменения будут отменены, схема вернётся к последнему сохранённому состоянию.' }]}
      variant="warning"
      buttons={[
        {
          label: 'Cancel',
          variant: 'outline',
          action: () => onOpenChange(false),
        },
        {
          label: 'Reset Changes',
          variant: 'destructive',
          action: onConfirm,
        },
      ]}
    />
  );
}

