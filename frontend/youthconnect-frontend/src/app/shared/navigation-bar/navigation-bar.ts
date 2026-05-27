import { Component } from '@angular/core';
import { Router, RouterLink } from "@angular/router";

@Component({
  selector: 'app-navigation-bar',
  // imports: [RouterLink],
  templateUrl: './navigation-bar.html',
  styleUrl: './navigation-bar.scss',
})
export class NavigationBar {
  isMenuOpen = false;

  constructor(private router: Router) { }

  toggleMenu(): void {
    this.isMenuOpen = !this.isMenuOpen;
  }

  handleNavClick(route: string): void {
    this.isMenuOpen = false;
    
    if (route === 'home') {
      this.scrollToSection('home');
    } else {
      this.navigateTo(route);
    }
  }

  navigateTo(route: string): void {
    if (route === '/about') {
      this.scrollToSection('about');
    } else if (route === '/projects') {
      this.scrollToSection('projects');
    } else if (route === '/leaders') {
      this.scrollToSection('leaders');
    } else {
      this.router.navigate([route]);
    }
  }

  scrollToTop(): void {
    if (this.router.url === '/' || this.router.url === '') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      this.router.navigate(['/']).then(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }
  }

  private scrollToSection(sectionId: string): void {
    if (this.router.url === '/' || this.router.url === '') {
      const section = document.getElementById(sectionId);
      if (section) {
        section.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      this.router.navigate(['/']).then(() => {
        setTimeout(() => {
          const section = document.getElementById(sectionId);
          if (section) {
            section.scrollIntoView({ behavior: 'smooth' });
          }
        }, 100);
      });
    }
  }
}
