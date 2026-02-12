import { AbstractControl, ValidatorFn } from '@angular/forms';

/**
 * If status is "blocked", a blockedReason must be provided.
 */
export const blockedNeedsReasonValidator: ValidatorFn = (control: AbstractControl) => {
  const status = control.get('status')?.value;
  const reason = control.get('blockedReason')?.value;

  if (status === 'blocked' && (!reason || reason.trim().length === 0)) {
    return { blockedNeedsReason: true };
  }
  return null;
};

/**
 * If priority is 1 (Critical), an assignee must be set.
 */
export const priorityOneNeedsAssigneeValidator: ValidatorFn = (control: AbstractControl) => {
  const priority = control.get('priority')?.value;
  const assignee = control.get('assignee')?.value;

  if (priority === 1 && (!assignee || assignee.trim().length === 0)) {
    return { priorityOneNeedsAssignee: true };
  }
  return null;
};
