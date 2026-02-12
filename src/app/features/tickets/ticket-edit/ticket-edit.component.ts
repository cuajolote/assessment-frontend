import {
  Component,
  ChangeDetectionStrategy,
  inject,
  DestroyRef,
  OnInit,
  input,
  output,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Ticket, TICKET_STATUSES, TICKET_PRIORITIES, STATUS_LABELS, PRIORITY_LABELS } from '../../../core/models/ticket.model';
import { blockedNeedsReasonValidator, priorityOneNeedsAssigneeValidator } from '../../../core/utils/ticket-validators';

@Component({
  selector: 'app-ticket-edit',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './ticket-edit.component.html',
  styleUrl: './ticket-edit.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TicketEditComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  ticket = input.required<Ticket>();
  ticketSave = output<{ id: string; patch: Partial<Ticket> }>();
  panelClose = output<void>();

  form!: FormGroup;
  showBlockedReason = false;

  readonly STATUSES = TICKET_STATUSES;
  readonly PRIORITIES = TICKET_PRIORITIES;
  readonly STATUS_LABELS = STATUS_LABELS;
  readonly PRIORITY_LABELS = PRIORITY_LABELS;

  ngOnInit(): void {
    const t = this.ticket();

    this.form = this.fb.group(
      {
        title: [t.title, [Validators.required, Validators.minLength(10)]],
        status: [t.status, [Validators.required]],
        priority: [t.priority, [Validators.required]],
        assignee: [t.assignee || ''],
        blockedReason: [t._blockedReason || ''],
        tags: [t.tags.join(', ')],
      },
      {
        validators: [blockedNeedsReasonValidator, priorityOneNeedsAssigneeValidator],
      }
    );

    this.showBlockedReason = t.status === 'blocked';

    this.form
      .get('status')!
      .valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((status: string) => {
        this.showBlockedReason = status === 'blocked';
      });
  }

  onSave(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const val = this.form.value;
    const tags = (val.tags as string)
      .split(',')
      .map((t: string) => t.trim().toLowerCase())
      .filter((t: string) => t.length > 0);

    this.ticketSave.emit({
      id: this.ticket().id,
      patch: {
        title: val.title,
        status: val.status,
        priority: Number(val.priority) as Ticket['priority'],
        assignee: val.assignee || undefined,
        tags,
        _blockedReason: val.blockedReason || undefined,
      },
    });
  }

  onClose(): void {
    this.panelClose.emit();
  }

  hasError(field: string, error: string): boolean {
    const control = this.form.get(field);
    return !!control && control.hasError(error) && control.touched;
  }
}
