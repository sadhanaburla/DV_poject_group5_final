const OUTER_WIDTH = 900,
  OUTER_HEIGHT = 550,
  TILE_TEXT_PADDING = 4,
  DEFAULT_FONT_SIZE = 10;

const LEGEND = {
  marginX: 150, // Between legend items
  rowElements: 5,
  rectSize: 15,
  marginY: 10,
  textOffsetX: 3,
  textOffsetY: -2
};
LEGEND.width = LEGEND.marginX * LEGEND.rowElements;

// http://vrl.cs.brown.edu/color
const DARK_SCHEME = ['rgb(75,0,131)', 'rgb(186,85,211)', 'rgb(0,0,255)', 'rgb(47,79,79)', 'rgb(72,61,139)', 'rgb(211,211,211)', 'rgb(128,128,128)'];
const colorScale = d3.scaleOrdinal(DARK_SCHEME);

const wrapper = d3.select('.d3-wrapper');

const tooltip = wrapper.append('div')
  .attr('class', 'tooltip')
  .attr('id', 'tooltip')
  .style('opacity', 0);

const svg = wrapper.append('svg')
  .attr('id', 'tree-map')
  .attr('width', OUTER_WIDTH)
  .attr('height', OUTER_HEIGHT)

d3.json('movie-data.json')
  .then((data) => {
    const root = d3.hierarchy(data)
      .sum(d => d.value)
      .sort((a, b) => b.height - a.height || b.value - a.value);

    d3.treemap()
      .size([OUTER_WIDTH, OUTER_HEIGHT])
      .paddingInner(2)
      (root);

    const dataCell = svg.selectAll('g')
      .data(root.leaves())
      .enter().append('g')
      .attr('class', 'data-cell')
      .attr('transform', (d) => `translate(${d.x0}, ${d.y0})`)
      .each((d) => {
        const words = d.data.name.split(/\s(?=[a-zA-Z])/g); // Treat e.g. "Story 3" as one word instead
        const maxRows = (d.y1 - d.y0 - DEFAULT_FONT_SIZE - TILE_TEXT_PADDING) / DEFAULT_FONT_SIZE;
        const parentInnerWidth = d.x1 - d.x0 - TILE_TEXT_PADDING * 2;
        const maxCharacters = Math.floor(parentInnerWidth / 6.5); // 6.5px / 1 character for Roboto Monospace
        d.data.rowData = textToRows(words, maxRows);
        d.data.fontSize = ((maxCharacters / d.data.rowData.maxChars) < 1 ? (maxCharacters / d.data.rowData.maxChars) : 1) + 'em';
      })
      .on('mousemove', (d) => {
        tooltip
          .style('opacity', .9)
          .html(
            'Name: ' + d.data.name
            + '<br>Category: ' + d.data.category
            + '<br>Value: ' + d.data.value
          )
          .attr('data-imdb', d.data.value)
          .style('left', (d3.event.pageX + 15) + 'px')
          .style('top', (d3.event.pageY - 30) + 'px');
      })
      .on('mouseout', () => tooltip.style('opacity', 0))

    // Tiles
    dataCell.append('rect')
      .attr('class', 'tile')
      .attr('width', (d) => d.x1 - d.x0)
      .attr('height', (d) => d.y1 - d.y0)
      .attr('data-name', (d) => d.data.name)
      .attr('data-category', (d) => d.data.category)
      .attr('data-imdb', (d) => d.data.value)
      .attr('fill', (d) => colorScale(d.data.category));

    // Tile texts
    dataCell.append('text')
      .attr('class', 'tile-text')
      .attr('font-size', d => d.data.fontSize)
      .selectAll('tspan')
      .data((d) => d.data.rowData.rows)
      .enter().append('tspan')
      .attr('x', TILE_TEXT_PADDING)
      .attr('y', (d, i) => TILE_TEXT_PADDING + (i + 1) * DEFAULT_FONT_SIZE)
      .text((d) => d);

    // Gets the unique categories for legend (same as [...new Set()])
    const categories = root.leaves()
      .map((nodes) => nodes.data.category)
      .filter((category, index, array) => array.indexOf(category) === index);


    LEGEND.height = Math.ceil(categories.length / LEGEND.rowElements) * (LEGEND.rectSize + LEGEND.marginY);
    const legend = wrapper.append('svg')
      .attr('id', 'legend')
      .attr('width', LEGEND.width)
      .attr('height', LEGEND.height);

    const legendGroup = legend.append('g')
      .selectAll('g')
      .data(categories)
      .enter().append('g') // Legend items
      .attr('transform', (d, i) => {
        const columnIndex = i % LEGEND.rowElements;
        const rowIndex = Math.floor(i / LEGEND.rowElements);
        const translateX = columnIndex * LEGEND.marginX;
        const translateY = rowIndex * (LEGEND.rectSize + LEGEND.marginY);
        return (`translate(${translateX}, ${translateY})`);
      })

    legendGroup.append('rect')
      .attr('width', LEGEND.rectSize)
      .attr('height', LEGEND.rectSize)
      .attr('class', 'legend-item')
      .attr('fill', (d) => colorScale(d))

    legendGroup.append('text')
      .attr('x', LEGEND.rectSize + LEGEND.textOffsetX)
      .attr('y', LEGEND.rectSize + LEGEND.textOffsetY)
      .text((d) => d);
  }

  ).catch(err => console.log(err));

// Helper functions

function textToRows(words, rows) {
  if (rows >= words.length) return { rows: [...words], maxChars: words.reduce((a, v) => v.length > a ? v.length : a, 0) };
  let currentRows = [...words], currentMaxChars = Infinity, currentRowSum, currentMinIndex, newMaxChars;
  while (currentRows.length > rows) {
    // Finds two subsequent rows that can be combined with smallest total length
    for (let i = 0; i < currentRows.length - 1; i++) {
      currentRowSum = currentRows[i].length + currentRows[i + 1].length + 1;
      if (currentRowSum < currentMaxChars) {
        currentMaxChars = currentRowSum;
        currentMinIndex = i; // Save for combining rows at this index and index + 1.
      }
    }
    // Combines the two found rows 
    currentRows[currentMinIndex] += ' ' + currentRows[currentMinIndex + 1];
    for (let i = currentMinIndex + 1; i < currentRows.length - 1; i++) {
      currentRows[i] = currentRows[i + 1];
    }
    currentRows.pop();
    newMaxChars = currentMaxChars;
    currentMaxChars = Infinity;
  }

  // Evens the variance if possible by taking first word from a lengthy row
  // and appending it to the previous row.
  let nextRowWord;
  for (let i = 0; i < currentRows.length - 1; i++) {
    nextRowWord = currentRows[i + 1].split(' ')[0];
    if (currentRows[i].length + nextRowWord.length < currentRows[i + 1].length) {
      currentRows[i] += ' ' + nextRowWord;
      currentRows[i + 1] = currentRows[i + 1].split(' ').slice(1).join(' ');
    }
  }
  return { rows: currentRows, maxChars: newMaxChars };
}
