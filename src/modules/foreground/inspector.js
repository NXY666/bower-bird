class Inspector {
	constructor() {
		this.bindMethods();
		this.initializeElements();
		this.forbidden = [this.$cacheEl];
		this.ignore = [HTMLIFrameElement, HTMLHtmlElement, HTMLBodyElement];
	}

	bindMethods() {
		this.logMouseMovement = this.logMouseMovement.bind(this);
	}

	initializeElements() {
		this.$target = document.body;
		this.$cacheEl = document.body;
	}

	loadTemplate() {
		// 从解析后的 HTML 文档中获取模板元素
		this.template = `
	<template class='tl-template'>
	<style>
		.tl-wrap {
			pointer-events: none;
			position: fixed;
			top: 0;
			right: 0;
			bottom: 0;
			left: 0;
			z-index: 2147483647;
		}

		.new-element {
			position: absolute;
			top: 30px; /* Adjust this value to position the new element */
			padding: 4px;
			left: 0;
			opacity: 0;
			transition: opacity 0.5s, transform 0.5s;
			transform: translateY(-100%);
			z-index: 2147483646; /* lower this value to make it appear behind the tl-codeWrap */
			animation: drop-in 0.5s forwards;
		}

		@keyframes drop-in {
			0% {
				transform: translateY(-120%);
			}
			100% {
				transform: translateY(0%);
			}
		}

		.new-element.show {
			opacity: 1;
			transform: translateY(0%);
		}

		.tl-wrap.-out .tl-canvas {
			transition: opacity 0.3s;
			opacity: 0;
		}

		@-webkit-keyframes tl-show {
			0% {
				transform: translate(0, -100%);
			};
		}

		@keyframes tl-show {
			0% {
				transform: translate(0, -100%);
			};
		}

		@-webkit-keyframes tl-hide {
			45% {
				transform: translate(0, 30%);
			}

			100% {
				transform: translate(0, -100%);
			};
		}

		@keyframes tl-hide {
			45% {
				transform: translate(0, 30%);
			}

			100% {	
				transform: translate(0, -100%);
			};
		}

	</style>

	<div class="tl-wrap">
		<canvas width='100' height='100' id='tl-canvas' class='tl-canvas'></canvas>

		<div class="new-element">
			<!-- Content for new-element goes here -->
		</div>
	</div>
</template>
`;
		this.createTemplateNodes();
		this.registerEvents();
	}

	createTemplateNodes() {
		this.createHostElement();
		this.attachShadowToHost();
		this.populateShadowTemplate();
		this.setShadowElementReferences();
	}

	createHostElement() {
		this.$host = document.createElement('div');
		this.$host.className = 'tl-host';
		this.$host.style.cssText = 'all: initial;';
		document.body.appendChild(this.$host);
	}

	attachShadowToHost() {
		this.shadow = this.$host.attachShadow({mode: 'open'});
	}

	populateShadowTemplate() {
		const templateMarkup = document.createElement("div");
		templateMarkup.innerHTML = this.template;
		this.shadow.innerHTML = templateMarkup.querySelector('template').innerHTML;
	}

	setShadowElementReferences() {
		this.$wrap = this.shadow.querySelector('.tl-wrap');
	}

	logMouseMovement(e) {
		this.$target = e.target;

		if (this.forbidden.includes(this.$target)) {
			return;
		} else if (this.ignore.includes(this.$target.constructor)) {
			return;
		}

		this.$cacheEl = this.$target;
		this.renderer.drawOverlay(this.$target);
	}

	registerEvents() {
		document.addEventListener('mousemove', this.logMouseMovement);
		document.addEventListener('mouseleave', () => {
			this.renderer.clearOverlay();
		});
		document.addEventListener('mouseover', () => {
			this.renderer.clearOverlay();
		});
	}

	activate() {
		this.loadTemplate();
		this.renderer = new Renderer(this.shadow);
		this.renderer.registerEvents(() => this.$target);
	}

	deactivate() {
		this.$wrap.classList.add('-out');
		document.removeEventListener('mousemove', this.logMouseMovement);
		setTimeout(() => {
			if (document.body.contains(this.$host)) {
				document.body.removeChild(this.$host);
			}
		}, 300);
	}
}

class Renderer {
	constructor(shadowRoot) {
		this.shadowRoot = shadowRoot;
		this.bindMethods();
		this.setCanvasElement();
	}

	bindMethods() {
		this.drawOverlay = this.drawOverlay.bind(this);
		this.handleResize = this.handleResize.bind(this);
	}

	setCanvasElement() {
		this.canvas = this.shadowRoot.querySelector("#tl-canvas");
		this.canvas.width = window.innerWidth;
		this.canvas.height = window.innerHeight;
		this.canvas.style.pointerEvents = "none";
		this.ctx = this.canvas.getContext("2d");
	}

	drawOverlay(element) {
		const rect = element.getBoundingClientRect();
		const computedStyle = window.getComputedStyle(element);
		const box = {
			width: rect.width,
			height: rect.height,
			top: rect.top,
			left: rect.left,
			margin: {
				top: parseInt(computedStyle.marginTop, 10),
				right: parseInt(computedStyle.marginRight, 10),
				bottom: parseInt(computedStyle.marginBottom, 10),
				left: parseInt(computedStyle.marginLeft, 10)
			},
			padding: {
				top: parseInt(computedStyle.paddingTop, 10),
				right: parseInt(computedStyle.paddingRight, 10),
				bottom: parseInt(computedStyle.paddingBottom, 10),
				left: parseInt(computedStyle.paddingLeft, 10)
			}
		};

		["margin", "padding"].forEach(property => {
			for (const el in box[property]) {
				box[property][el] = Math.max(0, box[property][el]);
			}
		});

		this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

		box.left = Math.floor(box.left) + 1.5;
		box.width = Math.floor(box.width) - 1;

		let x, y, width, height;

		// content
		x = box.left;
		y = box.top;
		width = box.width;
		height = box.height;

		this.ctx.fillStyle = "rgba(73,187,231,0.5)";
		this.ctx.clearRect(x, y, width, height);
		this.ctx.fillRect(x, y, width, height);

		// rulers (horizontal)
		x = -10;
		y = Math.floor(box.top) + 0.5;
		width = this.canvas.width + 10;
		height = box.height - 1;

		this.ctx.beginPath();
		this.ctx.setLineDash([10, 3]);
		this.ctx.fillStyle = "rgba(0,0,0,0.02)";
		this.ctx.strokeStyle = "rgba(13, 139, 201, 0.45)";
		this.ctx.lineWidth = 1;
		this.ctx.rect(x, y, width, height);
		this.ctx.stroke();
		this.ctx.fill();

		// rulers (vertical)
		x = box.left;
		y = -10;
		width = box.width;
		height = this.canvas.height + 10;

		this.ctx.beginPath();
		this.ctx.setLineDash([10, 3]);
		this.ctx.fillStyle = "rgba(0,0,0,0.02)";
		this.ctx.strokeStyle = "rgba(13, 139, 201, 0.45)";
		this.ctx.lineWidth = 1;
		this.ctx.rect(x, y, width, height);
		this.ctx.stroke();
		this.ctx.fill();
	}

	clearOverlay() {
		this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
	}

	handleResize() {
		this.canvas.width = window.innerWidth;
		this.canvas.height = window.innerHeight;
	}

	registerEvents(getTargetCallback) {
		document.addEventListener('scroll', () => {
			this.drawOverlay(getTargetCallback());
		});

		window.addEventListener('resize', () => {
			this.handleResize();
			this.drawOverlay(getTargetCallback());
		});
	}
}

export default Inspector;
