/**
 * OpenWebProject - Task Hierarchy & WBS Computation
 */
import { Task } from '../types/project';

/**
 * Recalculates WBS codes, types (summary/normal/milestone), and display IDs for a flat ordered list of tasks.
 * Preserves the list order while correctly setting parent relationships.
 */
export function recalculateHierarchy(tasks: Task[]): Task[] {
  if (tasks.length === 0) return [];

  // 1. Identify which tasks have children
  const parentIdSet = new Set<string>();
  tasks.forEach((t) => {
    if (t.parentId) {
      parentIdSet.add(t.parentId);
    }
  });

  // 2. Build hierarchical WBS numbering
  // Map of parentId -> array of child tasks in current order
  const childrenMap = new Map<string | null, Task[]>();
  tasks.forEach((t) => {
    const pId = t.parentId || null;
    if (!childrenMap.has(pId)) {
      childrenMap.set(pId, []);
    }
    childrenMap.get(pId)!.push(t);
  });

  const updatedTasksMap = new Map<string, Task>();

  function assignWbs(pId: string | null, prefix: string) {
    const children = childrenMap.get(pId) || [];
    children.forEach((child, index) => {
      const currentWbs = prefix ? `${prefix}.${index + 1}` : `${index + 1}`;
      const hasChildren = parentIdSet.has(child.id);
      
      let taskType = child.type;
      if (hasChildren) {
        taskType = 'summary';
      } else if (child.durationDays === 0) {
        taskType = 'milestone';
      } else if (taskType === 'summary') {
        taskType = 'normal';
      }

      updatedTasksMap.set(child.id, {
        ...child,
        wbs: currentWbs,
        type: taskType,
      });

      if (hasChildren) {
        assignWbs(child.id, currentWbs);
      }
    });
  }

  assignWbs(null, '');

  // Return tasks in original array order with updated attributes and sequential display IDs
  return tasks.map((t, index) => {
    const updated = updatedTasksMap.get(t.id) || t;
    return {
      ...updated,
      displayId: index + 1,
      order: index,
    };
  });
}

/**
 * Indents a task: makes it a subtask of the preceding task if possible.
 */
export function indentTask(tasks: Task[], taskId: string): Task[] {
  const index = tasks.findIndex((t) => t.id === taskId);
  if (index <= 0) return tasks;

  const currentTask = tasks[index];
  const prevTask = tasks[index - 1];

  // If prevTask has the same parent or is a valid preceding sibling, current becomes child of prevTask
  // Or if prevTask is already a sibling:
  const newTasks = tasks.map((t) => {
    if (t.id === taskId) {
      return { ...t, parentId: prevTask.id };
    }
    return t;
  });

  return recalculateHierarchy(newTasks);
}

/**
 * Outdents a task: moves it one level up in the hierarchy.
 */
export function outdentTask(tasks: Task[], taskId: string): Task[] {
  const currentTask = tasks.find((t) => t.id === taskId);
  if (!currentTask || !currentTask.parentId) return tasks;

  const parentTask = tasks.find((t) => t.id === currentTask.parentId);
  const newParentId = parentTask ? parentTask.parentId || null : null;

  const newTasks = tasks.map((t) => {
    if (t.id === taskId) {
      return { ...t, parentId: newParentId };
    }
    return t;
  });

  return recalculateHierarchy(newTasks);
}

/**
 * Moves a task up in order
 */
export function moveTaskUp(tasks: Task[], taskId: string): Task[] {
  const index = tasks.findIndex((t) => t.id === taskId);
  if (index <= 0) return tasks;

  const newTasks = [...tasks];
  const temp = newTasks[index];
  newTasks[index] = newTasks[index - 1];
  newTasks[index - 1] = temp;

  return recalculateHierarchy(newTasks);
}

/**
 * Moves a task down in order
 */
export function moveTaskDown(tasks: Task[], taskId: string): Task[] {
  const index = tasks.findIndex((t) => t.id === taskId);
  if (index < 0 || index >= tasks.length - 1) return tasks;

  const newTasks = [...tasks];
  const temp = newTasks[index];
  newTasks[index] = newTasks[index + 1];
  newTasks[index + 1] = temp;

  return recalculateHierarchy(newTasks);
}

/**
 * Returns all descendant task IDs of a given task ID.
 */
export function getDescendantIds(tasks: Task[], parentId: string): string[] {
  const descendants: string[] = [];
  const queue = [parentId];

  while (queue.length > 0) {
    const currId = queue.shift()!;
    tasks.forEach((t) => {
      if (t.parentId === currId) {
        descendants.push(t.id);
        queue.push(t.id);
      }
    });
  }

  return descendants;
}
