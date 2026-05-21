import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { NavigationBar } from "../../shared/navigation-bar/navigation-bar";
import { CarouselComponent } from "../carousel-component/carousel-component";
import { LeadersLandingPage } from "../leaders-landing-page/leaders-landing-page";
import { ScrollIndicatorComponent } from "../scroll-indicator/app-scroll-indicator";

@Component({
  selector: 'app-landing-page',
  imports: [NavigationBar, CarouselComponent, LeadersLandingPage, ScrollIndicatorComponent],
  templateUrl: './landing-page.html',
  styleUrl: './landing-page.scss',
})
export class LandingPage {

  constructor(private router: Router) { }

  navigateTo(route: string): void {
    this.router.navigate([route]);
  }
}
