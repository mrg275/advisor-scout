"use client";

import { useEffect, useRef } from "react";

/**
 * A slow citation network behind the page: nodes drift, and a line appears
 * between any two that come close. It is the shape of the thing this app
 * maps — papers, authors and institutions connected by citation — rather
 * than decoration borrowed from somewhere else.
 *
 * It stays far behind the content: a few percent opacity, no pointer
 * events, hidden from assistive technology. It holds still for anyone who
 * asks for reduced motion, and stops entirely when the tab is hidden.
 */
export default function BackgroundField() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const ACCENT = "#1d4a3e";
    const LINK_DISTANCE = 150;

    let width = 0;
    let height = 0;
    let frame = 0;

    const nodes = Array.from({ length: 44 }, () => ({
      x: Math.random(),
      y: Math.random(),
      vx: (Math.random() - 0.5) * 0.0004,
      vy: (Math.random() - 0.5) * 0.0004,
      r: 1 + Math.random() * 1.8,
    }));

    function resize() {
      width = canvas!.clientWidth;
      height = canvas!.clientHeight;
      canvas!.width = Math.floor(width * dpr);
      canvas!.height = Math.floor(height * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function draw() {
      ctx!.clearRect(0, 0, width, height);

      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i];
          const b = nodes[j];
          const dx = (a.x - b.x) * width;
          const dy = (a.y - b.y) * height;
          const distance = Math.hypot(dx, dy);
          if (distance >= LINK_DISTANCE) continue;
          ctx!.globalAlpha = (1 - distance / LINK_DISTANCE) * 0.09;
          ctx!.strokeStyle = ACCENT;
          ctx!.lineWidth = 1;
          ctx!.beginPath();
          ctx!.moveTo(a.x * width, a.y * height);
          ctx!.lineTo(b.x * width, b.y * height);
          ctx!.stroke();
        }
      }

      for (const node of nodes) {
        ctx!.globalAlpha = 0.14;
        ctx!.fillStyle = ACCENT;
        ctx!.beginPath();
        ctx!.arc(node.x * width, node.y * height, node.r, 0, Math.PI * 2);
        ctx!.fill();
      }

      ctx!.globalAlpha = 1;
    }

    function step() {
      for (const node of nodes) {
        node.x += node.vx;
        node.y += node.vy;
        if (node.x < 0 || node.x > 1) node.vx *= -1;
        if (node.y < 0 || node.y > 1) node.vy *= -1;
      }
      draw();
      frame = requestAnimationFrame(step);
    }

    function start() {
      if (reduced || document.hidden) return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(step);
    }

    function stop() {
      cancelAnimationFrame(frame);
    }

    function onVisibility() {
      if (document.hidden) stop();
      else start();
    }

    resize();
    draw();
    start();

    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 h-full w-full"
    />
  );
}
