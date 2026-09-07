import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { AuthService } from '../../auth.service';
import { Service, ServiceInput } from '../../models/service.model';

@Component({
  selector: 'app-service-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './service-admin.html',
  styleUrls: ['./service-admin.css']
})
export class ServiceAdminComponent implements OnInit {
  services: Service[] = [];
  editingId: number | null = null;
  showForm = false;
  error = '';

  form: ServiceInput = {
    name: '',
    hourly_rate: 0,
    active: true
  };

  constructor(
    private http: HttpClient,
    private auth: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    this.auth.loadUser().subscribe(user => {
      if (user?.platformRole !== 'ADMIN') {
        this.router.navigate(['/']);
        return;
      }
      this.load();
    });
  }

  load() {
    this.http
      .get<Service[]>('/api/services?includeInactive=true', { withCredentials: true })
      .subscribe({
        next: services => this.services = services,
        error: () => this.error = 'Unable to load services.'
      });
  }

  add() {
    this.editingId = null;
    this.form = { name: '', hourly_rate: 0, active: true };
    this.showForm = true;
  }

  edit(service: Service) {
    this.editingId = service.id;
    this.form = {
      name: service.name,
      hourly_rate: Number(service.hourly_rate),
      active: service.active
    };
    this.showForm = true;
  }

  save() {
    if (!this.form.name.trim() || Number(this.form.hourly_rate) < 0) {
      this.error = 'Service name and a valid hourly rate are required.';
      return;
    }

    const request = this.editingId
      ? this.http.put(`/api/services/${this.editingId}`, this.form, { withCredentials: true })
      : this.http.post('/api/services', this.form, { withCredentials: true });

    request.subscribe({
      next: () => {
        this.showForm = false;
        this.editingId = null;
        this.error = '';
        this.load();
      },
      error: () => this.error = 'Unable to save service.'
    });
  }

  cancel() {
    this.showForm = false;
    this.editingId = null;
  }
}
