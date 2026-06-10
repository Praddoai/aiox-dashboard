import {
  deskSvg, whiteboardSvg, plantSvg, coffeeSvg, bookshelfSvg, monitorSvg,
  serverRackSvg, cameraSvg, chartBoardSvg, rugSvg, lampSvg, couchSvg,
  meetingTableSvg, waterCoolerSvg, printerSvg, stickyWallSvg, cabinetSvg, projectorScreenSvg,
} from './pixel-sprites';
import type { FurnitureItem, DomainId } from './world-layout';
import { useDomains } from './DomainContext';

interface RoomFurnitureProps {
  items: FurnitureItem[];
  domain: DomainId;
  tileSize: number;
}

const furnitureSize: Record<FurnitureItem['type'], { w: number; h: number }> = {
  desk: { w: 48, h: 36 },
  monitor: { w: 42, h: 36 },
  whiteboard: { w: 48, h: 42 },
  plant: { w: 30, h: 42 },
  coffee: { w: 24, h: 30 },
  bookshelf: { w: 48, h: 48 },
  serverRack: { w: 32, h: 48 },
  camera: { w: 36, h: 32 },
  chartBoard: { w: 44, h: 40 },
  rug: { w: 80, h: 48 },
  lamp: { w: 20, h: 44 },
  couch: { w: 56, h: 30 },
  meetingTable: { w: 64, h: 44 },
  waterCooler: { w: 24, h: 44 },
  printer: { w: 40, h: 32 },
  stickyWall: { w: 56, h: 44 },
  cabinet: { w: 32, h: 44 },
  projectorScreen: { w: 60, h: 44 },
};

function getFurnitureSvg(type: FurnitureItem['type'], color: string): string {
  switch (type) {
    case 'desk': return deskSvg(color);
    case 'monitor': return monitorSvg();
    case 'whiteboard': return whiteboardSvg();
    case 'plant': return plantSvg();
    case 'coffee': return coffeeSvg();
    case 'bookshelf': return bookshelfSvg();
    case 'serverRack': return serverRackSvg();
    case 'camera': return cameraSvg();
    case 'chartBoard': return chartBoardSvg();
    case 'rug': return rugSvg(color);
    case 'lamp': return lampSvg(color);
    case 'couch': return couchSvg(color);
    case 'meetingTable': return meetingTableSvg(color);
    case 'waterCooler': return waterCoolerSvg();
    case 'printer': return printerSvg();
    case 'stickyWall': return stickyWallSvg();
    case 'cabinet': return cabinetSvg();
    case 'projectorScreen': return projectorScreenSvg();
  }
}

export function RoomFurniture({ items, domain, tileSize }: RoomFurnitureProps) {
  const domains = useDomains();
  const domainCfg = domains[domain];

  return (
    <>
      {items.map((item, i) => {
        const size = furnitureSize[item.type];
        const svgHtml = getFurnitureSvg(item.type, domainCfg.tileBorder);

        return (
          <div
            key={`${item.type}-${i}`}
            className="absolute pointer-events-none"
            style={{
              left: item.x * tileSize,
              top: item.y * tileSize,
              width: size.w,
              height: size.h,
              imageRendering: 'pixelated',
              // Z-ordering: rugs behind, everything else sorted by Y (depth)
              zIndex: item.type === 'rug' ? 0 : item.y + 2,
            }}
            dangerouslySetInnerHTML={{ __html: svgHtml }}
          />
        );
      })}
    </>
  );
}
