export class FixedStepper {
  constructor(step = 1 / 60) { this.step = step; this.accumulator = 0; this.time = 0; }
  reset() { this.accumulator = 0; }
  get alpha(){return Math.max(0,Math.min(1,this.accumulator/this.step));}
  advance(elapsed, update) {
    this.accumulator += Math.min(0.25, Math.max(0, elapsed));
    let count = 0;
    while (this.accumulator + 1e-10 >= this.step) {
      update(this.step);
      this.accumulator -= this.step;
      this.time += this.step;
      count++;
    }
    return count;
  }
}
