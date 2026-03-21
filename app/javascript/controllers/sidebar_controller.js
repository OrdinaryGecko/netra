import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["shell", "toggle"]

  connect() {
    this.collapsed = window.localStorage.getItem("netra.sidebarCollapsed") === "true"
    this.render()
  }

  toggle() {
    this.collapsed = !this.collapsed
    window.localStorage.setItem("netra.sidebarCollapsed", this.collapsed)
    this.render()
  }

  render() {
    if (this.hasShellTarget) {
      this.shellTarget.classList.toggle("shell--collapsed", this.collapsed)
    }

    if (this.hasToggleTarget) {
      this.toggleTarget.textContent = this.collapsed ? "Expand" : "Collapse"
    }
  }
}
