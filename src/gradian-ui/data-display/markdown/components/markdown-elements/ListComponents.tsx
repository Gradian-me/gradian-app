'use client';

import React from 'react';
import { TaskListItem } from '../TaskListItem';
import { isTaskList } from '../../utils/markdownComponentUtils';

export interface ListItemProps {
  children?: React.ReactNode;
  checked?: boolean;
  [key: string]: any;
}

export interface UnorderedListProps {
  children?: React.ReactNode;
  [key: string]: any;
}

export interface OrderedListProps {
  children?: React.ReactNode;
  [key: string]: any;
}

export function UnorderedList({ children, ...props }: UnorderedListProps) {
  const taskList = isTaskList(children);

  if (taskList) {
    return (
      <ul className="list-none ml-0 mb-4 space-y-2 text-gray-700 dark:text-gray-300" {...props}>
        {children ?? null}
      </ul>
    );
  }

  return (
    <ul className="list-disc ml-6 mb-4 space-y-1 text-gray-700 dark:text-gray-300" {...props}>
      {children ?? null}
    </ul>
  );
}

export function OrderedList({ children }: OrderedListProps) {
  return (
    <ol className="list-decimal ml-6 mb-4 space-y-1 text-gray-700 dark:text-gray-300">
      {children ?? null}
    </ol>
  );
}

export function ListItem({ children, checked, ...props }: ListItemProps) {
  const isTaskListItem = checked !== null && checked !== undefined;

  if (isTaskListItem) {
    return <TaskListItem checked={checked} {...props}>{children ?? null}</TaskListItem>;
  }

  return (
    <li className="mb-1" {...props}>
      {children ?? null}
    </li>
  );
}

