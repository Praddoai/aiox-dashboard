import { describe, it, expect, beforeEach } from 'vitest';
import { useDashboardWidgetStore } from '../dashboardWidgetStore';

describe('dashboardWidgetStore', () => {
  beforeEach(() => {
    useDashboardWidgetStore.getState().resetWidgets();
    useDashboardWidgetStore.getState().setCustomizing(false);
  });

  it('should have all widgets visible by default', () => {
    const { widgets } = useDashboardWidgetStore.getState();
    expect(widgets.every((w) => w.visible)).toBe(true);
    expect(widgets.length).toBeGreaterThan(0);
  });

  it('should toggle widget visibility', () => {
    useDashboardWidgetStore.getState().toggleWidget('metrics');
    const widget = useDashboardWidgetStore.getState().widgets.find((w) => w.id === 'metrics');
    expect(widget?.visible).toBe(false);

    useDashboardWidgetStore.getState().toggleWidget('metrics');
    const toggled = useDashboardWidgetStore.getState().widgets.find((w) => w.id === 'metrics');
    expect(toggled?.visible).toBe(true);
  });

  it('should move widget up and down', () => {
    const before = useDashboardWidgetStore.getState().widgets.sort((a, b) => a.order - b.order);
    const secondId = before[1].id;

    useDashboardWidgetStore.getState().moveWidget(secondId, 'up');
    const after = useDashboardWidgetStore.getState().widgets.sort((a, b) => a.order - b.order);
    expect(after[0].id).toBe(secondId);
  });

  it('should not move first widget up', () => {
    const before = [...useDashboardWidgetStore.getState().widgets].sort((a, b) => a.order - b.order);
    const firstId = before[0].id;
    const firstOrder = before[0].order;

    useDashboardWidgetStore.getState().moveWidget(firstId, 'up');
    const after = useDashboardWidgetStore.getState().widgets.find((w) => w.id === firstId);
    expect(after?.order).toBe(firstOrder);
  });

  it('should reset widgets to default', () => {
    useDashboardWidgetStore.getState().toggleWidget('metrics');
    useDashboardWidgetStore.getState().resetWidgets();
    const widget = useDashboardWidgetStore.getState().widgets.find((w) => w.id === 'metrics');
    expect(widget?.visible).toBe(true);
  });

  it('should check visibility via isVisible', () => {
    expect(useDashboardWidgetStore.getState().isVisible('metrics')).toBe(true);
    useDashboardWidgetStore.getState().toggleWidget('metrics');
    expect(useDashboardWidgetStore.getState().isVisible('metrics')).toBe(false);
  });

  it('should toggle customizing mode', () => {
    useDashboardWidgetStore.getState().setCustomizing(true);
    expect(useDashboardWidgetStore.getState().customizing).toBe(true);
  });
});
