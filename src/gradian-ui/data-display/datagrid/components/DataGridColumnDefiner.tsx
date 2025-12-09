// 'use client';

// import React, { useState, useRef, useEffect } from 'react';
// import { useTheme } from 'next-themes';
// import { X, Plus } from 'lucide-react';
// import { DataGridColumnDefinerProps, ColumnDefinition } from '../types';
// import { labelToSnakeCase } from '../utils';
// import { cn } from '../../../shared/utils';
// import { Button } from '../../../form-builder/form-elements/components/Button';

// interface ColumnItem {
//   id: string;
//   label: string;
//   description: string;
// }

// export const DataGridColumnDefiner: React.FC<DataGridColumnDefinerProps> = ({
//   onColumnsChange,
//   className,
// }) => {
//   const { resolvedTheme } = useTheme();
//   const [items, setItems] = useState<ColumnItem[]>([
//     { id: '1', label: '', description: '' }
//   ]);
//   const [focusedIndex, setFocusedIndex] = useState<number | null>(0);
//   const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

//   const isDark = resolvedTheme === 'dark' || (resolvedTheme === 'system' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches);

//   useEffect(() => {
//     // Focus the first label input on mount
//     if (inputRefs.current[0] && items.length === 1 && !items[0].label) {
//       inputRefs.current[0]?.focus();
//     }
//   }, []);

//   const addItem = (index?: number) => {
//     const newItem: ColumnItem = {
//       id: Date.now().toString() + Math.random(),
//       label: '',
//       description: ''
//     };
    
//     if (typeof index === 'number') {
//       const newItems = [...items];
//       newItems.splice(index + 1, 0, newItem);
//       setItems(newItems);
//       setFocusedIndex(index + 1);
//       setTimeout(() => {
//         const refIndex = index + 1;
//         inputRefs.current[refIndex]?.focus();
//       }, 0);
//     } else {
//       setItems([...items, newItem]);
//       setFocusedIndex(items.length);
//       setTimeout(() => {
//         inputRefs.current[items.length]?.focus();
//       }, 0);
//     }
//   };

//   const removeItem = (id: string) => {
//     const newItems = items.filter(item => item.id !== id);
//     setItems(newItems);
//     if (newItems.length === 0) {
//       setItems([{ id: '1', label: '', description: '' }]);
//       setFocusedIndex(0);
//     }
//   };

//   const updateItem = (id: string, field: 'label' | 'description', value: string) => {
//     setItems(items.map(item =>
//       item.id === id ? { ...item, [field]: value } : item
//     ));
//   };

//   const handleLabelKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
//     if (e.key === 'Enter') {
//       e.preventDefault();
//       const currentItem = items[index];
//       if (currentItem.label.trim()) {
//         addItem(index);
//       }
//     }
//   };

//   const handleGenerateTable = () => {
//     const validColumns: ColumnDefinition[] = items
//       .filter(item => item.label.trim())
//       .map(item => ({
//         name: labelToSnakeCase(item.label),
//         label: item.label.trim(),
//         description: item.description.trim() || undefined
//       }));

//     if (validColumns.length > 0) {
//       onColumnsChange(validColumns);
//     }
//   };

//   const hasValidColumns = items.some(item => item.label.trim());

//   return (
//     <div className={cn('w-full', className)}>
//       <div className="space-y-2">
//         {items.map((item, index) => (
//           <div
//             key={item.id}
//             className={cn(
//               'flex items-center gap-2 p-3 rounded-lg border transition-colors',
//               isDark
//                 ? 'border-gray-700 bg-gray-800/50 hover:bg-gray-800'
//                 : 'border-gray-200 bg-white hover:bg-gray-50'
//             )}
//           >
//             <div className="flex-1 grid grid-cols-2 gap-2">
//               <input
//                 ref={el => { inputRefs.current[index] = el; }}
//                 type="text"
//                 placeholder="Column label (required)"
//                 value={item.label}
//                 onChange={(e) => updateItem(item.id, 'label', e.target.value)}
//                 onKeyDown={(e) => handleLabelKeyDown(e, index)}
//                 onFocus={() => setFocusedIndex(index)}
//                 className={cn(
//                   'px-3 py-2 rounded-md text-sm border transition-colors',
//                   'focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent',
//                   isDark
//                     ? 'bg-gray-900 border-gray-600 text-gray-100 placeholder:text-gray-500'
//                     : 'bg-white border-gray-300 text-gray-900 placeholder:text-gray-400'
//                 )}
//               />
//               <input
//                 type="text"
//                 placeholder="Description (optional)"
//                 value={item.description}
//                 onChange={(e) => updateItem(item.id, 'description', e.target.value)}
//                 onFocus={() => setFocusedIndex(index)}
//                 className={cn(
//                   'px-3 py-2 rounded-md text-sm border transition-colors',
//                   'focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent',
//                   isDark
//                     ? 'bg-gray-900 border-gray-600 text-gray-100 placeholder:text-gray-500'
//                     : 'bg-white border-gray-300 text-gray-900 placeholder:text-gray-400'
//                 )}
//               />
//             </div>
//             <button
//               type="button"
//               onClick={() => removeItem(item.id)}
//               className={cn(
//                 'p-2 rounded-md transition-colors',
//                 'hover:bg-red-100 dark:hover:bg-red-900/30',
//                 'text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400'
//               )}
//               aria-label="Remove column"
//             >
//               <X className="h-4 w-4" />
//             </button>
//           </div>
//         ))}
//       </div>

//       <div className="flex items-center justify-between mt-4">
//         <button
//           type="button"
//           onClick={() => addItem()}
//           className={cn(
//             'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
//             isDark
//               ? 'text-violet-400 hover:bg-gray-800 hover:text-violet-300'
//               : 'text-violet-600 hover:bg-violet-50 hover:text-violet-700'
//           )}
//         >
//           <Plus className="h-4 w-4" />
//           Add Column
//         </button>

//         <Button
//           onClick={handleGenerateTable}
//           disabled={!hasValidColumns}
//           variant="primary"
//           size="md"
//         >
//           Generate Table
//         </Button>
//       </div>
//     </div>
//   );
// };

// DataGridColumnDefiner.displayName = 'DataGridColumnDefiner';
