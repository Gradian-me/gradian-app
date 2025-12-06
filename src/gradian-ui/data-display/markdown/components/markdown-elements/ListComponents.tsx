'use client';

import React from 'react';
import { TaskListItem } from '../TaskListItem';
import { isTaskList, isEmptyChildren } from '../../utils/markdownComponentUtils';

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
  
  // Filter out empty list items
  const filteredChildren = React.Children.toArray(children).filter((child: any) => {
    if (React.isValidElement(child) && child.props) {
      const props = child.props as { children?: React.ReactNode };
      return !isEmptyChildren(props.children);
    }
    return true;
  });

  if (taskList) {
    return (
      <ul className="list-none ms-0 mb-4 space-y-2 text-gray-700 dark:text-gray-300" {...props}>
        {filteredChildren.length > 0 ? filteredChildren : null}
      </ul>
    );
  }

  return (
    <ul className="list-disc ms-6 mb-4 space-y-1 text-gray-700 dark:text-gray-300" {...props}>
      {filteredChildren.length > 0 ? filteredChildren : null}
    </ul>
  );
}

export function OrderedList({ children, ...props }: OrderedListProps) {
  // Filter out empty list items
  const filteredChildren = React.Children.toArray(children).filter((child: any) => {
    if (React.isValidElement(child) && child.props) {
      const props = child.props as { children?: React.ReactNode };
      return !isEmptyChildren(props.children);
    }
    return true;
  });

  return (
    <ol className="list-decimal ms-6 mb-4 space-y-1 text-gray-700 dark:text-gray-300" {...props}>
      {filteredChildren.length > 0 ? filteredChildren : null}
    </ol>
  );
}

export function ListItem({ children, checked, ...props }: ListItemProps) {
  // Don't render empty list items
  if (isEmptyChildren(children)) {
    return null;
  }

  const isTaskListItem = checked !== null && checked !== undefined;

  if (isTaskListItem) {
    return <TaskListItem checked={checked} {...props}>{children}</TaskListItem>;
  }

  return (
    <li className="mb-1" {...props}>
      {children}
    </li>
  );
}

