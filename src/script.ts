type CurvesConnections = { boxA: string; boxB: string }[];

interface CurvlyOptions {
  // A function to call everytime the element is being dragged.
  onDrag?: (e: DragEvent) => void;
  // A function to call everytime the element is starting to be dragged.
  onDragStart?: (e: DragEvent) => void;
  // A function to call everytime the element has stopped being dragged.
  onDragEnd?: (e: DragEvent) => void;
  // If set to 0, the curve will be in the center of the element,
  // If set to a big number, it will come out of the box element.
  padding?: number;
  // the undulating nature of a curve between 0 and 1 (0 is a straight line)
  bezierWeight?: number;
  // the connections between the draggable elements
  connections: CurvesConnections;
  // the zone in the screen which will draw the paths
  paths: SVGElement;
}

interface OffsetPosition {
  left: number;
  top: number;
}

class CurvlyConfig {
  private options: CurvlyOptions;

  // stores the IDs of the elements we set as draggable already
  // in order to avoid duplications of events in `setDraggable` method.
  private elements: string[] = [];

  constructor(options: CurvlyOptions) {
    const body = document.querySelector("body");
    if (body) {
      body.addEventListener("dragover", this.dragOver.bind(this));
      body.addEventListener("drop", this.drop.bind(this));
      this.options = options;
      // may be undefined so we set the default values
      this.options.padding ??= 0;
      this.options.bezierWeight ??= 0.675;
      for (let connection of options.connections) {
        const boxA = document.querySelector(connection.boxA);
        const boxB = document.querySelector(connection.boxB);
        if (boxA && boxB) {
          if (!this.elements.includes(connection.boxA)) {
            this.setDraggable(document.querySelector(connection.boxA) as HTMLElement);
            this.elements.push(connection.boxA);
          }
          if (!this.elements.includes(connection.boxB)) {
            this.setDraggable(document.querySelector(connection.boxB) as HTMLElement);
            this.elements.push(connection.boxB);
          }
        } else {
          throw new Error(
            `ID "${boxA == null ? connection.boxA : connection.boxB}" is not defined.`
          );
        }
        // initialization
        this.coordinates();
      }
    } else {
      throw new Error("The body is not defined.");
    }
  }

  private offset(element: Element): OffsetPosition {
    var rect = element.getBoundingClientRect();

    var offset: OffsetPosition = {
      top: rect.top + window.scrollY,
      left: rect.left + window.scrollX,
    };

    return offset;
  }

  private coordinates(): void {
    let oldPaths = this.options.paths.children;
    for (let a = oldPaths.length - 1; a >= 0; a--) {
      this.options.paths.removeChild(oldPaths[a]);
    }

    let x2, x3;

    for (let a = 0; a < this.options.connections.length; a++) {
      const connection = this.options.connections[a];
      const boxA = document.querySelector(connection.boxA) as HTMLElement;
      const boxB = document.querySelector(connection.boxB) as HTMLElement;

      if (boxA == null || boxB == null)
        throw new Error(`ID "${boxA == null ? connection.boxA : connection.boxB}" is not defined.`);

      const boxAOffset = this.offset(boxA);
      const boxBOffset = this.offset(boxB);
      const x1 = boxAOffset.left + boxA.clientWidth / 2 - this.options.padding!;
      const y1 = boxAOffset.top + boxA.clientHeight / 2 - this.options.padding!;
      const x4 = boxBOffset.left + boxA.clientWidth / 2 - this.options.padding!;
      const y4 = boxBOffset.top + boxA.clientHeight / 2 - this.options.padding!;
      const dx = Math.abs(x4 - x1) * this.options.bezierWeight!;

      if (x4 < x1) {
        x2 = x1 - dx;
        x3 = x4 + dx;
      } else {
        x2 = x1 + dx;
        x3 = x4 - dx;
      }

      const data = `M${x1} ${y1} C ${x2} ${y1} ${x3} ${y4} ${x4} ${y4}`;
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", data);
      path.setAttribute("class", "path");
      this.options.paths.appendChild(path);
    }
  }

  private setDraggable(element: HTMLElement): void {
    element.setAttribute("draggable", "true");
    element.addEventListener("dragstart", (e) => {
      this.drag(e);
      this.options.onDragStart?.(e);
    });
    element.addEventListener("dragend", (e) => {
      this.coordinates();
      this.options.onDragEnd?.(e);
    });
    if (this.options.onDrag) element.addEventListener("drag", this.options.onDrag.bind(this));
  }

  private drag(e: DragEvent): void {
    const target = e.target as HTMLElement;
    if (target) {
      if (!target.hasAttribute("id")) {
        throw new Error("The dragged element does not have an ID.");
      }
      const dataTransferred = e.dataTransfer;
      if (dataTransferred) {
        var style = window.getComputedStyle(target, null);
        var str =
          parseInt(style.getPropertyValue("left")) -
          e.clientX +
          "," +
          (parseInt(style.getPropertyValue("top")) - e.clientY) +
          "," +
          target.getAttribute("id");
        e.dataTransfer.setData("Text", str);
      }
    } else {
      throw new Error("The dragged element does not exist.");
    }
  }

  private drop(e: DragEvent): void {
    const transferedData = e.dataTransfer;
    if (transferedData) {
      const offset = transferedData.getData("Text").split(",");
      const dm = document.getElementById(offset[2]);
      if (dm) {
        dm.style.left = e.clientX + parseInt(offset[0], 10) + "px";
        dm.style.top = e.clientY + parseInt(offset[1], 10) + "px";
        e.preventDefault();
      } else {
        throw new Error("Cannot drop the item because it does not have an ID.");
      }
    }
  }

  private dragOver(e: DragEvent): void {
    e.preventDefault();
  }
}
