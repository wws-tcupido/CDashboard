import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../auth.service';
import { Service } from '../../models/service.model';
import { TimeEntry, TimeEntryInput } from '../../models/time-entry.model';

@Component({
  selector: 'app-time-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './time-list.html',
  styleUrls: ['./time-list.css']
})
export class TimeListComponent implements OnInit {
  entries: TimeEntry[] = [];
  services: Service[] = [];
  loading = false;
  saving = false;
  error = '';
  showForm = false;
  isAdmin = false;
  view: 'mine' | 'team' = 'mine';
  editingId: number | null = null;
  selectedMonth = 'all';

  form: TimeEntryInput = {
    service_id: 0,
    work_date: this.today(),
    hours: 1,
    description: ''
  };

  constructor(
    private http: HttpClient,
    private auth: AuthService
  ) {}

  ngOnInit() {
    this.auth.loadUser().subscribe(user => {
      this.isAdmin = user?.platformRole === 'ADMIN';
      this.loadServices();
      this.loadEntries();
    });
  }

  loadServices() {
    this.http
      .get<Service[]>('/api/services', { withCredentials: true })
      .subscribe({
        next: services => {
          this.services = services.filter(service => service.active);
          if (!this.form.service_id && this.services.length) {
            this.form.service_id = this.services[0].id;
          }
        },
        error: () => this.error = 'Unable to load services.'
      });
  }

  loadEntries() {
    this.loading = true;
    this.error = '';

    const scope = this.isAdmin && this.view === 'team' ? 'team' : 'mine';

    this.http
      .get<TimeEntry[]>(`/api/time?scope=${scope}`, { withCredentials: true })
      .subscribe({
        next: entries => {
          this.entries = entries.sort((a, b) =>
            b.work_date.localeCompare(a.work_date) || b.id - a.id
          );
          this.loading = false;
        },
        error: () => {
          this.error = 'Unable to load time entries.';
          this.loading = false;
        }
      });
  }

  setView(view: 'mine' | 'team') {
    this.view = view;
    this.selectedMonth = 'all';
    this.cancelEdit();
    this.loadEntries();
  }

  openForm() {
    this.editingId = null;
    this.form = {
      service_id: this.services[0]?.id ?? 0,
      work_date: this.today(),
      hours: 1,
      description: ''
    };
    this.showForm = true;
  }

  edit(entry: TimeEntry) {
    if (this.view === 'team' && entry.user_id !== this.auth.user?.userId) {
      return;
    }

    this.editingId = entry.id;
    this.form = {
      service_id: entry.service_id,
      work_date: entry.work_date.substring(0, 10),
      hours: Number(entry.hours),
      description: entry.description
    };
    this.showForm = true;
  }

  save() {
    if (
      !this.form.service_id ||
      !this.form.work_date ||
      !this.form.description.trim() ||
      Number(this.form.hours) <= 0
    ) {
      this.error = 'Date, service, hours and description are required.';
      return;
    }

    this.saving = true;
    this.error = '';

    const request = this.editingId
      ? this.http.put(`/api/time/${this.editingId}`, this.form, { withCredentials: true })
      : this.http.post('/api/time', this.form, { withCredentials: true });

    request.subscribe({
      next: () => {
        this.saving = false;
        this.showForm = false;
        this.editingId = null;
        this.loadEntries();
      },
      error: () => {
        this.error = 'Unable to save this time entry.';
        this.saving = false;
      }
    });
  }

  delete(entry: TimeEntry) {
    if (!confirm('Delete this time entry?')) return;

    this.http
      .delete(`/api/time/${entry.id}`, { withCredentials: true })
      .subscribe({
        next: () => this.loadEntries(),
        error: () => this.error = 'Unable to delete this time entry.'
      });
  }

  cancelEdit() {
    this.showForm = false;
    this.editingId = null;
  }

  get availableMonths() {
    const months = new Set(this.entries.map(entry => entry.work_date.substring(0, 7)));
    return Array.from(months).sort((a, b) => b.localeCompare(a));
  }

  get visibleEntries() {
    if (this.selectedMonth === 'all') return this.entries;
    return this.entries.filter(entry => entry.work_date.startsWith(this.selectedMonth));
  }

  monthLabel(value: string) {
    const [year, month] = value.split('-').map(Number);
    return new Date(year, month - 1, 1).toLocaleDateString(undefined, {
      month: 'long',
      year: 'numeric'
    });
  }

  get thisWeekEntries() {
    const start = this.startOfWeek(new Date());
    const end = new Date(start);
    end.setDate(start.getDate() + 7);

    return this.entries.filter(entry => {
      const date = this.asLocalDate(entry.work_date);
      return date >= start && date < end;
    });
  }

  get thisMonthEntries() {
    const now = new Date();
    return this.entries.filter(entry => {
      const date = this.asLocalDate(entry.work_date);
      return date.getFullYear() === now.getFullYear()
        && date.getMonth() === now.getMonth();
    });
  }

  get weekHours() {
    return this.sumHours(this.thisWeekEntries);
  }

  get weekValue() {
    return this.sumValue(this.thisWeekEntries);
  }

  get monthHours() {
    return this.sumHours(this.thisMonthEntries);
  }

  get monthValue() {
    return this.sumValue(this.thisMonthEntries);
  }

  groupedEntries(): { date: string; entries: TimeEntry[]; hours: number; value: number }[] {
    const groups = new Map<string, TimeEntry[]>();

    for (const entry of this.visibleEntries) {
      const date = entry.work_date.substring(0, 10);
      groups.set(date, [...(groups.get(date) ?? []), entry]);
    }

    return Array.from(groups.entries()).map(([date, entries]) => ({
      date,
      entries,
      hours: this.sumHours(entries),
      value: this.sumValue(entries)
    }));
  }

  entryValue(entry: TimeEntry) {
    return Number(entry.hours) * Number(entry.hourly_rate);
  }

  private sumHours(entries: TimeEntry[]) {
    return entries.reduce((total, entry) => total + Number(entry.hours), 0);
  }

  private sumValue(entries: TimeEntry[]) {
    return entries.reduce((total, entry) => total + this.entryValue(entry), 0);
  }

  private startOfWeek(date: Date) {
    const value = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const day = value.getDay();
    value.setDate(value.getDate() - day);
    return value;
  }

  private asLocalDate(value: string) {
    const [year, month, day] = value.substring(0, 10).split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  private today() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
