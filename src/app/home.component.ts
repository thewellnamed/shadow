import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {
  public encounters: any;

  constructor() { }

  ngOnInit(): void {
    this.encounters = [
      { value: 1, label: 'Hydross the Unstable #1 (Wipe, 9:14pm)' },
      { value: 2, label: 'Hydross the Unstable #2 (Kill, 9:27pm)' },
      { value: 3, label: 'The Lurker Below (Kill, 9:47pm)' }
    ];
  }
}
