import { FormBuilder } from '@angular/forms';
import { blockedNeedsReasonValidator, priorityOneNeedsAssigneeValidator } from './ticket-validators';

describe('Ticket Validators', () => {
  const fb = new FormBuilder();

  describe('blockedNeedsReasonValidator', () => {
    function buildForm(status: string, blockedReason: string) {
      return fb.group(
        { status: [status], blockedReason: [blockedReason] },
        { validators: [blockedNeedsReasonValidator] }
      );
    }

    it('should return error when status is blocked and no reason', () => {
      const form = buildForm('blocked', '');
      expect(form.hasError('blockedNeedsReason')).toBe(true);
    });

    it('should return error when status is blocked and reason is whitespace', () => {
      const form = buildForm('blocked', '   ');
      expect(form.hasError('blockedNeedsReason')).toBe(true);
    });

    it('should pass when status is blocked and reason is provided', () => {
      const form = buildForm('blocked', 'Waiting for approval');
      expect(form.hasError('blockedNeedsReason')).toBe(false);
    });

    it('should pass when status is not blocked', () => {
      const form = buildForm('open', '');
      expect(form.hasError('blockedNeedsReason')).toBe(false);
    });

    it('should pass when status is in_progress without reason', () => {
      const form = buildForm('in_progress', '');
      expect(form.hasError('blockedNeedsReason')).toBe(false);
    });
  });

  describe('priorityOneNeedsAssigneeValidator', () => {
    function buildForm(priority: number, assignee: string) {
      return fb.group(
        { priority: [priority], assignee: [assignee] },
        { validators: [priorityOneNeedsAssigneeValidator] }
      );
    }

    it('should return error when priority is 1 and no assignee', () => {
      const form = buildForm(1, '');
      expect(form.hasError('priorityOneNeedsAssignee')).toBe(true);
    });

    it('should return error when priority is 1 and assignee is whitespace', () => {
      const form = buildForm(1, '   ');
      expect(form.hasError('priorityOneNeedsAssignee')).toBe(true);
    });

    it('should pass when priority is 1 and assignee is set', () => {
      const form = buildForm(1, 'Alice Johnson');
      expect(form.hasError('priorityOneNeedsAssignee')).toBe(false);
    });

    it('should pass when priority is not 1', () => {
      const form = buildForm(3, '');
      expect(form.hasError('priorityOneNeedsAssignee')).toBe(false);
    });

    it('should pass for priority 5 without assignee', () => {
      const form = buildForm(5, '');
      expect(form.hasError('priorityOneNeedsAssignee')).toBe(false);
    });
  });
});
