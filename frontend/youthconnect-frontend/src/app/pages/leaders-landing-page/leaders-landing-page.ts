import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { interval, Subscription } from 'rxjs';

interface SkOfficial {
  name: string;
  position: string;
  image: string;
}

interface SkOfficialSet {
  name: string;
  officials: SkOfficial[];
}

@Component({
  selector: 'app-leaders-landing-page',
  imports: [],
  templateUrl: './leaders-landing-page.html',
  styleUrl: './leaders-landing-page.scss',
})
export class LeadersLandingPage implements OnInit, OnDestroy {
  
  skOfficialSets: SkOfficialSet[] = [
    {
      name: 'First Set',
      officials: [
        {
          name: 'Yngrid Kurei Factuar',
          position: 'SK Chairperson',
          image: '/assets/sk-official-1.png'
        },
        {
          name: 'Jenny L. Dela Vega',
          position: 'SK Kagawad',
          image: '/assets/sk-official-2.png'
        },
        {
          name: 'Aldwin Rheynold C. Diroy',
          position: 'SK Kagawad',
          image: '/assets/sk-official-3.png'
        },
        {
          name: 'Dana Verina A. Africa',
          position: 'SK Kagawad',
          image: '/assets/sk-official-4.png'
        }
      ]
    },
    {
      name: 'Second Set',
      officials: [
        {
          name: 'Princess Shed O. Sambo',
          position: 'SK Kagawad',
          image: '/assets/sk-official-5.png'
        },
        {
          name: 'Leiyan O. Piadozo',
          position: 'SK Kagawad',
          image: '/assets/sk-official-6.png'
        },
        {
          name: 'Sherredan A. Abdulla',
          position: 'SK Treasurer',
          image: '/assets/sk-official-7.png'
        },
        {
          name: 'Erick T. Baltazar',
          position: 'SK Secretary ',
          image: '/assets/sk-official-8.png'
        }
      ]
    }
  ];

  currentSetIndex = 0;
  private carouselSubscription: Subscription | undefined;
  autoplayInterval = 6000;

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.startAutoplay();
  }

  ngOnDestroy(): void {
    if (this.carouselSubscription) {
      this.carouselSubscription.unsubscribe();
    }
  }

  startAutoplay(): void {
    this.carouselSubscription = interval(this.autoplayInterval).subscribe(() => {
      this.nextImage();
    });
  }

  nextImage(): void {
    this.currentSetIndex = (this.currentSetIndex + 1) % this.skOfficialSets.length;
  }

  prevImage(): void {
    this.currentSetIndex = (this.currentSetIndex - 1 + this.skOfficialSets.length) % this.skOfficialSets.length;
  }

  goToSet(index: number): void {
    if (index >= 0 && index < this.skOfficialSets.length) {
      this.currentSetIndex = index;
    }
  }

  get currentSkOfficialSet(): SkOfficialSet {
    return this.skOfficialSets[this.currentSetIndex];
  }

  get currentOfficials(): SkOfficial[] {
    return this.currentSkOfficialSet.officials;
  }

  get desktopOfficials(): SkOfficial[] {
    return this.currentOfficials.slice(0, 4);
  }

  get mobileOfficials(): SkOfficial[] {
    return this.currentOfficials;
  }

  navigateTo(route: string): void {
    this.router.navigate([route]);
  }
}