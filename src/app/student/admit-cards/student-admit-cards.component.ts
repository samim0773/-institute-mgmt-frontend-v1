import { Component, OnInit } from '@angular/core';
import { StudentPortalService } from '../services/student-portal.service';
import { AdmitCard } from '../../core/models';

@Component({
  selector:    'app-student-admit-cards',
  templateUrl: './student-admit-cards.component.html',
})
export class StudentAdmitCardsComponent implements OnInit {

  cards:   AdmitCard[] = [];
  loading  = true;
  error    = '';

  constructor(private portalService: StudentPortalService) {}

  ngOnInit(): void {
    this.portalService.getMyAdmitCards().subscribe({
      next:  res => { this.cards = res.data || []; this.loading = false; },
      error: ()  => { this.error = 'Failed to load admit cards.'; this.loading = false; },
    });
  }

  examName(card: AdmitCard): string {
    return typeof card.examId === 'object' ? (card.examId as any).name : 'Exam';
  }
}
