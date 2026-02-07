'use client';

import { ConfirmationMessage } from '@/gradian-ui/form-builder';

interface DeleteConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: 'field' | 'section';
  onConfirm: () => void;
}

export function DeleteConfirmDialog({ open, onOpenChange, type, onConfirm }: DeleteConfirmDialogProps) {
  return (
    <ConfirmationMessage
      isOpen={open}
      onOpenChange={onOpenChange}
      title={type === 'field' ? [{ en: 'Set Field Inactive' }, { fa: 'غیرفعال کردن فیلد' }, { ar: 'تعطيل الحقل' }, { es: 'Desactivar campo' }, { fr: 'Désactiver le champ' }, { de: 'Feld deaktivieren' }, { it: 'Disattiva campo' }, { ru: 'Деактивировать поле' }] : [{ en: 'Set Section Inactive' }, { fa: 'غیرفعال کردن بخش' }, { ar: 'تعطيل القسم' }, { es: 'Desactivar sección' }, { fr: 'Désactiver la section' }, { de: 'Bereich deaktivieren' }, { it: 'Disattiva sezione' }, { ru: 'Деактивировать раздел' }]}
      message={type === 'field' ? [{ en: 'Are you sure you want to set this field as inactive? It will be hidden from the form but can be reactivated later.' }, { fa: 'آیا مطمئن هستید که می‌خواهید این فیلد را غیرفعال کنید؟ از فرم مخفی می‌شود اما بعداً قابل فعال‌سازی مجدد است.' }, { ar: 'هل أنت متأكد أنك تريد تعطيل هذا الحقل؟ سيتم إخفاؤه من النموذج ولكن يمكن إعادة تفعيله لاحقًا.' }, { es: '¿Está seguro de que desea desactivar este campo? Se ocultará del formulario pero puede reactivarse más tarde.' }, { fr: 'Voulez-vous vraiment désactiver ce champ ? Il sera masqué du formulaire mais pourra être réactivé plus tard.' }, { de: 'Möchten Sie dieses Feld wirklich deaktivieren? Es wird im Formular ausgeblendet, kann aber später reaktiviert werden.' }, { it: 'Sei sicuro di voler disattivare questo campo? Sarà nascosto dal modulo ma potrà essere riattivato in seguito.' }, { ru: 'Вы уверены, что хотите деактивировать это поле? Оно будет скрыто в форме, но его можно будет снова активировать.' }] : [{ en: 'Are you sure you want to set this section as inactive? All fields in this section will also be set as inactive, but can be reactivated later.' }, { fa: 'آیا مطمئن هستید که می‌خواهید این بخش را غیرفعال کنید؟ تمام فیلدهای این بخش نیز غیرفعال می‌شوند اما بعداً قابل فعال‌سازی مجدد هستند.' }, { ar: 'هل أنت متأكد أنك تريد تعطيل هذا القسم؟ سيتم تعطيل جميع الحقول في هذا القسم أيضًا، ولكن يمكن إعادة تفعيلها لاحقًا.' }, { es: '¿Está seguro de que desea desactivar esta sección? Todos los campos de esta sección también se desactivarán, pero pueden reactivarse más tarde.' }, { fr: 'Voulez-vous vraiment désactiver cette section ? Tous les champs de cette section seront également désactivés mais pourront être réactivés plus tard.' }, { de: 'Möchten Sie diesen Bereich wirklich deaktivieren? Alle Felder in diesem Bereich werden ebenfalls deaktiviert, können aber später reaktiviert werden.' }, { it: 'Sei sicuro di voler disattivare questa sezione? Tutti i campi in questa sezione verranno disattivati ma potranno essere riattivati in seguito.' }, { ru: 'Вы уверены, что хотите деактивировать этот раздел? Все поля в этом разделе также будут деактивированы, но их можно будет снова активировать.' }]}
      variant="destructive"
      buttons={[
        {
          label: 'Cancel',
          variant: 'outline',
          action: () => onOpenChange(false),
        },
        {
          label: 'Delete',
          variant: 'destructive',
          icon: 'Trash2',
          action: onConfirm,
        },
      ]}
    />
  );
}

