/**
 * OpenWebProject - Planning Engine
 * Independent domain engine responsible for scheduling, dependencies,
 * cycle detection, summary task rollups, traffic lights, and critical path.
 */
import {
  ProjectCalendar,
  Task,
  TaskDependency,
  TrafficLight,
} from '../types/project';
import {
  addWorkingDays,
  calculateEndDate,
  countWorkingDays,
  DEFAULT_CALENDAR,
  getNextWorkingDay,
  getTodayString,
  getWorkingDaysPassed,
  isWorkingDay,
  stepDays,
} from './calendar';
import { recalculateHierarchy } from './hierarchy';

/**
 * Checks if adding a dependency between fromTaskId and toTaskId would produce a cycle.
 */
export function wouldCreateCycle(
  tasks: Task[],
  predecessorId: string,
  successorId: string
): boolean {
  if (predecessorId === successorId) return true;

  // Build adjacency list of dependencies: task -> list of successor ids
  const graph = new Map<string, string[]>();
  tasks.forEach((t) => {
    graph.set(t.id, []);
  });

  tasks.forEach((t) => {
    t.dependencies.forEach((dep) => {
      if (graph.has(dep.predecessorId)) {
        graph.get(dep.predecessorId)!.push(t.id);
      }
    });
  });

  // Temporarily add candidate edge: predecessorId -> successorId
  if (!graph.has(predecessorId)) {
    graph.set(predecessorId, []);
  }
  graph.get(predecessorId)!.push(successorId);

  // DFS cycle detection starting from successorId looking for predecessorId
  const visited = new Set<string>();
  const stack = [successorId];

  while (stack.length > 0) {
    const curr = stack.pop()!;
    if (curr === predecessorId) {
      return true; // Path exists back to predecessor! Cycle detected.
    }
    if (!visited.has(curr)) {
      visited.add(curr);
      const successors = graph.get(curr) || [];
      for (const succ of successors) {
        if (succ === predecessorId) return true;
        if (!visited.has(succ)) {
          stack.push(succ);
        }
      }
    }
  }

  return false;
}

/**
 * Recalculates the entire project schedule given calendar and tasks.
 */
export function calculateSchedule(
  tasks: Task[],
  calendar: ProjectCalendar = DEFAULT_CALENDAR,
  currentDateStr: string = getTodayString()
): Task[] {
  if (tasks.length === 0) return [];

  // Step 1: Ensure hierarchy structure is up to date
  let workingTasks = recalculateHierarchy([...tasks]);
  const taskMap = new Map<string, Task>(workingTasks.map((t) => [t.id, { ...t }]));

  // Step 2: Separate leaf tasks from summary tasks
  // Topological order calculation for leaf tasks based on dependencies
  const leafTasks = workingTasks.filter((t) => t.type !== 'summary');
  const summaryTasks = workingTasks.filter((t) => t.type === 'summary');

  // Compute in-degrees of dependencies for leaf tasks
  const inDegree = new Map<string, number>();
  const adjList = new Map<string, string[]>();

  leafTasks.forEach((t) => {
    inDegree.set(t.id, 0);
    adjList.set(t.id, []);
  });

  leafTasks.forEach((t) => {
    t.dependencies.forEach((dep) => {
      if (adjList.has(dep.predecessorId) && inDegree.has(t.id)) {
        adjList.get(dep.predecessorId)!.push(t.id);
        inDegree.set(t.id, (inDegree.get(t.id) || 0) + 1);
      }
    });
  });

  // Kahn's algorithm for topological sort of leaf tasks
  const queue: string[] = [];
  inDegree.forEach((deg, id) => {
    if (deg === 0) queue.push(id);
  });

  const orderedLeafIds: string[] = [];
  while (queue.length > 0) {
    const currId = queue.shift()!;
    orderedLeafIds.push(currId);

    const neighbors = adjList.get(currId) || [];
    for (const n of neighbors) {
      const newDeg = (inDegree.get(n) || 1) - 1;
      inDegree.set(n, newDeg);
      if (newDeg === 0) {
        queue.push(n);
      }
    }
  }

  // Any remaining tasks (e.g. unlinked or unresolved)
  leafTasks.forEach((t) => {
    if (!orderedLeafIds.includes(t.id)) {
      orderedLeafIds.push(t.id);
    }
  });

  // Step 3: Forward pass - schedule leaf tasks
  for (const taskId of orderedLeafIds) {
    const task = taskMap.get(taskId)!;
    let earliestStart = task.startDate;

    // Apply dependency constraints
    if (task.dependencies && task.dependencies.length > 0) {
      let maxDepStart = earliestStart;

      for (const dep of task.dependencies) {
        const pred = taskMap.get(dep.predecessorId);
        if (!pred) continue;

        let requiredStart = maxDepStart;

        switch (dep.type) {
          case 'FS': {
            // Finish-to-Start: Task starts after Predecessor finishes
            const dayAfterPredEnd = getNextWorkingDay(stepDays(pred.endDate, 1), calendar);
            requiredStart = addWorkingDays(dayAfterPredEnd, dep.lagDays, calendar);
            break;
          }
          case 'SS': {
            // Start-to-Start: Task starts when Predecessor starts
            requiredStart = addWorkingDays(pred.startDate, dep.lagDays, calendar);
            break;
          }
          case 'FF': {
            // Finish-to-Finish: Task ends when Predecessor ends
            const requiredEnd = addWorkingDays(pred.endDate, dep.lagDays, calendar);
            // Derive start from requiredEnd
            if (task.durationDays <= 1) {
              requiredStart = requiredEnd;
            } else {
              // calculate start date backwards from requiredEnd
              let curr = requiredEnd;
              let rem = task.durationDays - 1;
              while (rem > 0) {
                curr = stepDays(curr, -1);
                if (isWorkingDay(curr, calendar)) rem--;
              }
              requiredStart = curr;
            }
            break;
          }
          case 'SF': {
            // Start-to-Finish: Task finishes when Predecessor starts
            const requiredEnd = addWorkingDays(pred.startDate, dep.lagDays, calendar);
            if (task.durationDays <= 1) {
              requiredStart = requiredEnd;
            } else {
              let curr = requiredEnd;
              let rem = task.durationDays - 1;
              while (rem > 0) {
                curr = stepDays(curr, -1);
                if (isWorkingDay(curr, calendar)) rem--;
              }
              requiredStart = curr;
            }
            break;
          }
        }

        if (requiredStart > maxDepStart) {
          maxDepStart = requiredStart;
        }
      }

      earliestStart = maxDepStart;
    }

    // Apply specific date constraints
    if (task.constraintType && task.constraintDate) {
      const cDate = task.constraintDate;
      switch (task.constraintType) {
        case 'MSO': // Must start on
          earliestStart = cDate;
          break;
        case 'SNET': // Start no earlier than
          if (earliestStart < cDate) earliestStart = cDate;
          break;
        case 'SNLT': // Start no later than
          if (earliestStart > cDate) earliestStart = cDate;
          break;
      }
    }

    earliestStart = getNextWorkingDay(earliestStart, calendar);
    const calculatedEnd = calculateEndDate(earliestStart, task.durationDays, calendar);

    task.startDate = earliestStart;
    task.endDate = calculatedEnd;
    task.workHours = task.workHours || task.durationDays * (calendar.hoursPerDay || 8);

    taskMap.set(taskId, task);
  }

  // Step 4: Bottom-up Rollup of Summary Tasks
  // Sort summary tasks deepest level first (by WBS length descending)
  const sortedSummaries = [...summaryTasks].sort((a, b) => b.wbs.length - a.wbs.length);

  for (const summary of sortedSummaries) {
    // Find all direct children
    const children = Array.from(taskMap.values()).filter((t) => t.parentId === summary.id);

    if (children.length > 0) {
      let minStart = children[0].startDate;
      let maxEnd = children[0].endDate;
      let totalWork = 0;
      let weightedProgress = 0;

      children.forEach((c) => {
        if (c.startDate < minStart) minStart = c.startDate;
        if (c.endDate > maxEnd) maxEnd = c.endDate;

        const work = c.workHours || c.durationDays * 8 || 1;
        totalWork += work;
        weightedProgress += c.progress * work;
      });

      const rolledProgress = totalWork > 0 ? Math.round(weightedProgress / totalWork) : 0;
      const durationDays = countWorkingDays(minStart, maxEnd, calendar);

      summary.startDate = minStart;
      summary.endDate = maxEnd;
      summary.durationDays = durationDays;
      summary.workHours = totalWork;
      summary.progress = rolledProgress;

      taskMap.set(summary.id, summary);
    }
  }

  // Step 5: Critical Path Calculation (Forward & Backward pass)
  // Find project end date
  let projectEnd = '1970-01-01';
  taskMap.forEach((t) => {
    if (t.endDate > projectEnd) projectEnd = t.endDate;
  });

  // Calculate late dates and slack for leaf tasks
  const lateFinishMap = new Map<string, string>();
  const lateStartMap = new Map<string, string>();

  // Reverse topological order
  const revOrderedLeafIds = [...orderedLeafIds].reverse();
  for (const taskId of revOrderedLeafIds) {
    const task = taskMap.get(taskId)!;
    // Successors of this task
    const successors: { succ: Task; dep: TaskDependency }[] = [];
    leafTasks.forEach((other) => {
      other.dependencies.forEach((d) => {
        if (d.predecessorId === taskId) {
          successors.push({ succ: taskMap.get(other.id)!, dep: d });
        }
      });
    });

    let lateFinish = projectEnd;
    if (successors.length > 0) {
      let minLateFinish = projectEnd;
      for (const { succ, dep } of successors) {
        const succLateStart = lateStartMap.get(succ.id) || succ.startDate;
        let allowedFinish = succLateStart;
        if (dep.type === 'FS') {
          // Finish must precede succLateStart - lag
          allowedFinish = addWorkingDays(succLateStart, -1 - dep.lagDays, calendar);
        }
        if (allowedFinish < minLateFinish) {
          minLateFinish = allowedFinish;
        }
      }
      lateFinish = minLateFinish;
    }

    lateFinishMap.set(taskId, lateFinish);
    const lateStart = addWorkingDays(lateFinish, -(task.durationDays - 1), calendar);
    lateStartMap.set(taskId, lateStart);

    // Slack in days = count working days between Early Start and Late Start
    const slack = countWorkingDays(task.startDate, lateStart, calendar) - 1;
    task.slackDays = Math.max(0, slack);
    task.isCritical = task.durationDays > 0 && slack <= 0;
  }

  // Summary tasks are critical if any subtask is critical
  summaryTasks.forEach((st) => {
    const summary = taskMap.get(st.id)!;
    const hasCriticalChild = Array.from(taskMap.values()).some(
      (c) => c.parentId === summary.id && c.isCritical
    );
    summary.isCritical = hasCriticalChild;
  });

  // Step 6: Traffic Light Calculation (Semáforo de desviación)
  taskMap.forEach((task) => {
    const totalWorkingDays = countWorkingDays(task.startDate, task.endDate, calendar);
    const workingDaysPassed = getWorkingDaysPassed(
      task.startDate,
      task.endDate,
      currentDateStr,
      calendar
    );

    let expectedProgress = 0;
    if (totalWorkingDays > 0) {
      expectedProgress = Math.min(100, Math.round((workingDaysPassed / totalWorkingDays) * 100));
    }
    task.expectedProgress = expectedProgress;

    let light: TrafficLight = 'green';

    // Rules from Section 18:
    // 100% completed is always green
    if (task.progress >= 100) {
      light = 'green';
    }
    // If not started yet and not overdue, green
    else if (currentDateStr < task.startDate) {
      light = 'green';
    }
    // If past end date and not 100%, RED
    else if (currentDateStr > task.endDate && task.progress < 100) {
      light = 'red';
    }
    // In progress (current date within start and end)
    else {
      if (task.progress < expectedProgress) {
        light = 'yellow';
      } else {
        light = 'green';
      }
    }

    task.trafficLight = light;
  });

  return workingTasks.map((t) => taskMap.get(t.id)!);
}

/**
 * Finds all downstream dependent tasks (successors) of a modified task.
 */
export function getAffectedSuccessors(
  tasks: Task[],
  modifiedTaskId: string
): Task[] {
  const successors = new Set<string>();
  const queue = [modifiedTaskId];

  while (queue.length > 0) {
    const currId = queue.shift()!;
    tasks.forEach((t) => {
      const dependsOnCurr = t.dependencies.some((d) => d.predecessorId === currId);
      if (dependsOnCurr && !successors.has(t.id)) {
        successors.add(t.id);
        queue.push(t.id);
      }
    });
  }

  return tasks.filter((t) => successors.has(t.id));
}

/**
 * Checks if modifying a task affects successors and proposes recalculated dates.
 */
export function checkReprogrammingImpact(
  currentTasks: Task[],
  updatedTask: Task,
  calendar: ProjectCalendar = DEFAULT_CALENDAR
): {
  hasImpact: boolean;
  affectedTasks: Task[];
  proposedSchedule: Task[];
} {
  // Replace the updated task in currentTasks
  const tempTasks = currentTasks.map((t) => (t.id === updatedTask.id ? updatedTask : t));
  const proposedSchedule = calculateSchedule(tempTasks, calendar);

  // Compare dates of all downstream successors
  const affectedSuccessorList = getAffectedSuccessors(currentTasks, updatedTask.id);
  const affectedTasks: Task[] = [];

  affectedSuccessorList.forEach((origTask) => {
    const proposed = proposedSchedule.find((p) => p.id === origTask.id);
    if (
      proposed &&
      (proposed.startDate !== origTask.startDate || proposed.endDate !== origTask.endDate)
    ) {
      affectedTasks.push(proposed);
    }
  });

  return {
    hasImpact: affectedTasks.length > 0,
    affectedTasks,
    proposedSchedule,
  };
}
