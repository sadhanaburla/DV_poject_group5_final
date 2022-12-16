	// d3 code goes here
	let svg = d3.select('svg'),
	width = svg.attr('width'),
	height = svg.attr('height'),
	radius = Math.min(width, height) / 2;
	const tooltip = d3.select('#tooltip');

	
	let g = svg.append('g')
			.attr('transform', 'translate(' + width / 2 + ',' + height / 2 + ')');
	let color = d3.scaleOrdinal(['#C7CEEA','#B5EAD7','#FFDAC1', '#FF9AA2', ])
	let pie = d3.pie().value(function(d){
		return d.percent
	})
	let path = d3.arc()
			.outerRadius(radius - 40)
			.innerRadius(100);
	let label = d3.arc()
			.outerRadius(radius)
			.innerRadius(radius - 150);
	d3.csv('movie_imdb.csv').then(
		function(data){

		let arc = g.selectAll('.arc')
		.data(pie(data))
		.enter().append('g')
		.attr('class', 'arc')
		arc.append('path')
			.attr('d', path)
			.attr('fill', function(d){return color(d.data.company);})
			.on("mouseover", function (d, i){
				console.log(i)
				tooltip.transition()
					.duration(100)
					.style("opacity", 1)
			})
			.on("mousemove", function (d, i){
				tooltip.html(`Title: ${i.data.company}<br>IMDb Rating: ${i.data.percent}`)
				tooltip
					.style("left", d.clientX + "px")
					.style("top", d.clientY + "px")
			})
			.on("mouseout", function (d, i){
				tooltip.transition()
					.duration(100)
					.style("opacity", 0)
			});

		arc.append('text')
			.attr('transform', function(d){return 'translate(' + label.centroid(d) + ')';})
			.text(function(d){return d.data.company});
		svg.append('g')
			.attr('transform', 'translate(' + (width / 2 - 120) + ',' + 20 + ')')
			.append('text')
			.text('Movies Released in 2021')
			.attr('class', 'title')
		}
	);
