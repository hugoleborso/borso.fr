import ForceGraph from 'force-graph';
import type { JSX } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../atoms/Button';
import { composeClassName } from '../atoms/class-name.utils';
import { Icon } from '../atoms/Icon';
import { PageTitle } from '../atoms/PageTitle';
import { DateSlider } from '../molecules/DateSlider';
import { GraphLegend } from '../molecules/GraphLegend';
import { QueryState } from '../molecules/QueryState';
import {
  DISPLAY_LOCALE,
  formatMonth,
  formatShortDay,
  toIsoDay,
} from '../../lib/calendar-day.utils';
import { useDebouncedValue } from '../../lib/debounced-value.hook';
import { openActionSheet } from '../../lib/action-sheet.hook';
import { PRESSABLE_CLASS_NAME, usePressGesture } from '../../lib/press-gesture.hook';
import { useGraph } from '../../lib/queries/brain.queries';
import { buildPageHref } from '../../lib/wikilinks.core';
import {
  buildMonthlyTimeline,
  countNodeTypes,
  findNodeTitle,
  hideNodeTypes,
  isLatestTimelineIndex,
  NEIGHBOURHOOD_HOP_LIMIT,
  selectNeighbourhood,
  selectNodeClickIntent,
  selectNodeColorVariable,
  selectNodeTypeLabelKey,
  selectTimelineDate,
  shouldDrawLabels,
  toggleHiddenType,
} from './knowledge-graph.core';
import { computeCentredZoom, selectLinkColorVariable } from './graph-layout.core';
import {
  arrangeAroundOwner,
  relayout,
  releaseHeldNodes,
  rememberPositions,
  type GraphInstance,
  type GraphLink,
  type GraphNode,
} from '../../lib/graph-forces.adapter';

const NODE_RADIUS = 4;
const FOCUS_RING_RADIUS = 7;
const FOCUS_RING_WIDTH = 2;
const TOUCH_TARGET_RADIUS = 12;
const LABEL_FONT_SIZE = 11;
const LABEL_OFFSET = 7;
const FULL_CIRCLE = Math.PI + Math.PI;
const FIT_PADDING_PX = 40;
const SLIDER_SETTLE_MS = 250;
const EMPTY_GRAPH = { nodes: [], edges: [] };
const LABEL_FONT_FAMILY = "'Atkinson Hyperlegible Next', -apple-system, system-ui, sans-serif";

function readToken(element: HTMLElement, name: string): string {
  return getComputedStyle(element).getPropertyValue(name).trim();
}

// @FollowsBlueprint organism-imperative-bridge
export function KnowledgeGraph(): JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const graphRef = useRef<GraphInstance | null>(null);
  const focusedIdRef = useRef<string | null>(null);
  const fitDurationRef = useRef<number | null>(null);
  const hasFramedRef = useRef(false);
  const hoveredNodeRef = useRef<GraphNode | null>(null);
  const isNodeClickSuppressedRef = useRef(false);
  const today = toIsoDay(new Date());
  const timeline = buildMonthlyTimeline(today);
  const lastPosition = timeline.length - 1;
  const position = useDebouncedValue(lastPosition, SLIDER_SETTLE_MS);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [hiddenTypes, setHiddenTypes] = useState<ReadonlySet<string>>(new Set());
  const shownDate = selectTimelineDate(timeline, position.value);
  const graphDate = selectTimelineDate(timeline, position.settledValue);
  const graph = useGraph(graphDate);
  const fullGraph = graph.data ?? EMPTY_GRAPH;
  const neighbourhood = useMemo(
    () => selectNeighbourhood(fullGraph, focusedId, NEIGHBOURHOOD_HOP_LIMIT),
    [fullGraph, focusedId],
  );
  const visibleGraph = useMemo(
    () => hideNodeTypes(neighbourhood, hiddenTypes),
    [neighbourhood, hiddenTypes],
  );
  const focusedTitle = findNodeTitle(fullGraph.nodes, focusedId);
  const isToday = isLatestTimelineIndex(timeline, position.value);
  const discussNode = (nodeId: string, title: string): void => {
    openActionSheet({
      title,
      subject: { kind: 'page', path: nodeId },
      actions: [
        {
          labelKey: 'discuss.action.open',
          icon: 'open',
          onSelect: () => void navigate(buildPageHref(nodeId)),
        },
      ],
    });
  };
  const canvasPress = usePressGesture({
    onLongPress: () => {
      const node = hoveredNodeRef.current;
      if (node === null) return;
      isNodeClickSuppressedRef.current = true;
      discussNode(node.id, node.title);
    },
  });
  const focusPress = usePressGesture({
    onLongPress: () => {
      if (focusedId !== null && focusedTitle !== null) discussNode(focusedId, focusedTitle);
    },
  });

  const attachGraph = useCallback((container: HTMLDivElement) => {
    const inkColor = readToken(container, '--color-ink-soft');
    const patinaColor = readToken(container, '--color-patina');
    const instance = new ForceGraph<GraphNode, GraphLink>(container)
      .width(container.clientWidth)
      .height(container.clientHeight)
      .backgroundColor('rgba(0,0,0,0)')
      .nodeId('id')
      .nodeLabel('title')
      .linkColor((link) => readToken(container, selectLinkColorVariable(link.isClosed)))
      .linkWidth(1)
      .onNodeHover((node) => {
        hoveredNodeRef.current = node;
      })
      .onEngineStop(() => {
        const { nodes } = instance.graphData();
        rememberPositions(nodes);
        releaseHeldNodes(nodes);
        const fitDuration = fitDurationRef.current;
        if (fitDuration === null) return;
        fitDurationRef.current = null;
        hasFramedRef.current = nodes.length > 0;
        const zoom = computeCentredZoom(
          nodes,
          { width: instance.width(), height: instance.height() },
          FIT_PADDING_PX,
        );
        instance.centerAt(0, 0, fitDuration).zoom(zoom, fitDuration);
      })
      .nodePointerAreaPaint((node, paintColor, context) => {
        context.beginPath();
        context.arc(node.x ?? 0, node.y ?? 0, TOUCH_TARGET_RADIUS, 0, FULL_CIRCLE);
        Object.assign(context, { fillStyle: paintColor });
        context.fill();
      })
      .nodeCanvasObject((node, context, zoomScale) => {
        const nodeX = node.x ?? 0;
        const nodeY = node.y ?? 0;
        const isFocusedNode = node.id === focusedIdRef.current;
        if (isFocusedNode) {
          context.beginPath();
          context.arc(nodeX, nodeY, FOCUS_RING_RADIUS, 0, FULL_CIRCLE);
          Object.assign(context, { strokeStyle: patinaColor, lineWidth: FOCUS_RING_WIDTH });
          context.stroke();
        }
        context.beginPath();
        context.arc(nodeX, nodeY, NODE_RADIUS, 0, FULL_CIRCLE);
        Object.assign(context, { fillStyle: readToken(container, node.colorVariable) });
        context.fill();
        if (!shouldDrawLabels(instance.graphData().nodes.length, zoomScale)) return;
        Object.assign(context, {
          font: `${LABEL_FONT_SIZE / zoomScale}px ${LABEL_FONT_FAMILY}`,
          textAlign: 'center',
          textBaseline: 'top',
          fillStyle: inkColor,
        });
        context.fillText(node.title, nodeX, nodeY + LABEL_OFFSET / zoomScale);
      });
    arrangeAroundOwner(instance);
    graphRef.current = instance;
    const observer = new ResizeObserver(() => {
      instance.width(container.clientWidth).height(container.clientHeight);
    });
    observer.observe(container);
    return () => {
      observer.disconnect();
      instance._destructor();
      graphRef.current = null;
    };
  }, []);

  // @FollowsBlueprint lint-exception
  // eslint-disable-next-line borso/no-use-effect -- force-graph owns its canvas and simulation, so each new neighbourhood and click handler has to be pushed into the instance by hand.
  useEffect(() => {
    const instance = graphRef.current;
    if (instance === null) return;
    focusedIdRef.current = focusedId;
    fitDurationRef.current = relayout(instance, visibleGraph, graphDate, hasFramedRef.current);
    const actOnNode = {
      open: (nodeId: string) => void navigate(buildPageHref(nodeId)),
      focus: setFocusedId,
    } as const;
    instance.onNodeClick((node) => {
      if (isNodeClickSuppressedRef.current) {
        isNodeClickSuppressedRef.current = false;
        return;
      }
      actOnNode[selectNodeClickIntent(focusedId, node.id)](node.id);
    });
  }, [visibleGraph, graphDate, focusedId, navigate]);

  return (
    <div className="lg:-mx-40">
      <PageTitle
        subtitle={t('graph.count', {
          nodes: visibleGraph.nodes.length,
          edges: visibleGraph.edges.length,
        })}
        trailing={
          <Link
            to="/brain"
            className="inline-flex items-center gap-1 min-h-11 text-body-sm font-semibold text-bronze no-underline"
          >
            <Icon name="back" size={18} />
            {t('brain.page.back')}
          </Link>
        }
      >
        {t('graph.title')}
      </PageTitle>
      <div className="flex flex-col gap-3">
        <DateSlider
          dateLabel={formatShortDay(shownDate, DISPLAY_LOCALE)}
          firstLabel={formatMonth(timeline[0] ?? today, DISPLAY_LOCALE)}
          position={position.value}
          lastPosition={lastPosition}
          isToday={isToday}
          onPositionChanged={position.onValueChanged}
        />
        {focusedTitle === null ? null : (
          <div
            {...focusPress.handlers}
            className={composeClassName(
              'flex items-center gap-1 pl-3 pr-1 rounded-md bg-patina-soft',
              PRESSABLE_CLASS_NAME,
            )}
          >
            <Link
              to={buildPageHref(focusedId ?? '')}
              className="flex-1 min-w-0 inline-flex items-center gap-1 min-h-11 text-body-sm font-semibold text-patina no-underline"
            >
              <span className="truncate">{focusedTitle}</span>
              <Icon name="chevron" size={14} />
            </Link>
            <Button
              size="icon"
              variant="quiet"
              aria-label={t('graph.focus-clear')}
              onClick={() => setFocusedId(null)}
            >
              <Icon name="close" size={18} />
            </Button>
          </div>
        )}
        <div
          {...canvasPress.handlers}
          className={composeClassName(
            'relative h-[60dvh] rounded-lg border border-line bg-surface shadow-1 overflow-hidden touch-none',
            PRESSABLE_CLASS_NAME,
          )}
        >
          <div ref={attachGraph} className="absolute inset-0" />
          {graph.data === undefined ? (
            <div className="absolute inset-0 flex items-center justify-center p-4">
              <QueryState isPending={graph.isPending} onRetry={() => void graph.refetch()} />
            </div>
          ) : null}
        </div>
        <GraphLegend
          label={t('graph.legend')}
          entries={countNodeTypes(neighbourhood.nodes).map(({ type, count }) => ({
            type,
            count,
            label: t(selectNodeTypeLabelKey(type)),
            colorVariable: selectNodeColorVariable(type),
            isHidden: hiddenTypes.has(type),
          }))}
          onToggle={(type) => setHiddenTypes((hidden) => toggleHiddenType(hidden, type))}
        />
      </div>
    </div>
  );
}
