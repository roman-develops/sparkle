// ОХ ЗРЯ ТЫ СЮДА ПОЛЕЗ...
//
// 


const endpoint = localStorage.getItem('endpoint');
const linkPrefix = localStorage.getItem('link-prefix');
const startResource = localStorage.getItem('start-resource');
const username = localStorage.getItem('username');
const password = localStorage.getItem('password');

var width = window.innerWidth;
var height = window.innerHeight;

var svg = d3.select("body").append("svg")
    .attr("width", width)
    .attr("height", height);

var g = svg.append("g");

var objectNodes = [];
var predicateNodes = [];
var links = [];

var simulation = d3.forceSimulation(objectNodes.concat(predicateNodes))
    .force("link", d3.forceLink(links).id(d => d.id).distance(300).strength(1.5))
    .force("charge", d3.forceManyBody().strength(-600)); 

 
var forceCollide = d3.forceCollide().radius(20).strength(0.5); 
simulation.force("collide", forceCollide);


svg.append("defs").selectAll("marker")
    .data(["end"])  
    .enter().append("marker")    
    .attr("id", String)
    .attr("viewBox", "0 -5 10 10")
    .attr("refX", 42)
    .attr("refY", 0)
    .attr("markerWidth", 12)   
    .attr("markerHeight", 12)    
    .attr("orient", "auto")
    .append("path")
    .attr("d", "M0,-5L10,0L0,5");

var link = g.append("g")
    .selectAll("line");

var node = g.append("g")
    .selectAll("circle");

var rect = g.append("g")
    .selectAll("rect");

var labels = g.append("g")
    .selectAll("text");

function updateGraph() {
    link = link.data(links, d => d.source.id + "-" + d.target.id);
link.exit().remove();
link = link.enter().append("line").merge(link)
    .style("stroke", "#999")
    .attr("marker-end", d => predicateNodes.includes(d.source) ? "url(#end)" : "");  // Добавление стрелки к концу каждой линии только если источник является предикатом

    node = node.data(objectNodes, d => d.id);
    node.exit().remove();
    node = node.enter().append("circle").merge(node)
        .attr("r", 40)
        .style("fill", "#d3ebde")
        .call(d3.drag()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended))
            .on("click", function(d) {
                console.log(d.id);
                parentId = d.id;
                parentNodes[parentId] = true;
                processedNodes[parentId] = true;
                sendSPARQLQuery(0, parentId);
                updateGraph();
            });

    rect = rect.data(predicateNodes, d => d.id);
    rect.exit().remove();
    rect = rect.enter().append("rect").merge(rect)
        .attr("width", d => d.name.length * 6)
        .attr("height", 20)
        .style("fill", "#d3dceb")
        .call(d3.drag()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended));


    labels = labels.data(objectNodes.concat(predicateNodes), d => d.id);
    labels.selectAll("tspan").remove();
    labels.exit().remove();
    labels = labels.enter().append("text").merge(labels)
        .style("text-anchor", "middle")
        .style("fill", "#555")
        .style("font-family", "Arial")
        .style("font-size", 12)
        .style("pointer-events", "none")
        .attr("class", "noselect")
        .each(function(d) {
            var arr = d.name.split('\n');
            var prevWidth = 0;
            for (i = 0; i < arr.length; i++) {
                var tspan = d3.select(this).append("tspan")
                    .text(arr[i])
                    .attr("dy", i ? "1.2em" : 0)
                    .attr("dx", -prevWidth)
                    .attr("text-anchor", "middle")
                    .attr("class", "tspan" + i);
                prevWidth = tspan.node().getComputedTextLength();
            }
        });
    simulation.nodes(objectNodes.concat(predicateNodes));
    simulation.force("link").links(links);
    simulation.alpha(1).restart();
}

simulation.on("tick", () => {
    link.attr("x1", d => d.source.x)
        .attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x)
        .attr("y2", d => d.target.y);

    node.attr("cx", d => d.x)
        .attr("cy", d => d.y);

    rect.attr("x", d => d.x - d.name.length * 3)
        .attr("y", d => d.y - 10);

    labels.attr("x", d => d.x)
        .attr("y", d => d.y);
});

function dragstarted(d) {
    if (!d3.event.active) simulation.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
}

function dragged(d) {
    d.fx = d3.event.x;
    d.fy = d3.event.y;
}

function dragended(d) {
    if (!d3.event.active) simulation.alphaTarget(0);
    d.fx = null;
    d.fy = null;
}

var zoom = d3.zoom()
    .scaleExtent([0.03, 10])
    .on("zoom", () => {
        g.attr("transform", d3.event.transform);
    });

svg.call(zoom);

function replaceWithPrefixes(value) {
    const prefixes = {
        'cim': 'http://iec.ch/TC57/CIM100#',
        'rdf': 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
        'ups': 'https://cim.so-ups.ru#',
        'gost': 'http://gost.ru/2019/schema-cim01#'
    };

    for (let prefix in prefixes) {
        if (value.startsWith(prefixes[prefix])) {
            return value.replace(prefixes[prefix], prefix + ':');
        }
    }

    return value;
}

var nodeMap = {};
var processedNodes = {};
var parentNodes = {};
var fullDepth = 0;

   
    function sendSPARQLQuery(depth, subject, predicate = '?p') {
        const query = `
            PREFIX cim: <http://iec.ch/TC57/CIM100#>
            PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
            PREFIX ups: <https://cim.so-ups.ru#>
            SELECT ?s ?p ?o
            WHERE {
                ${subject} ${predicate} ?o
            }
            LIMIT 35
        `;

        const xhr = new XMLHttpRequest();
        xhr.open('POST', endpoint, false, username, password);
        xhr.setRequestHeader('Content-Type', 'application/sparql-query');

        xhr.send(query);

        if (xhr.status === 200) {
            const data = JSON.parse(xhr.responseText);
            let predicateMap = {};
            data.results.bindings.forEach(binding => {
                var o = binding.o ? replaceWithPrefixes(binding.o.value) : 'N/A';
                var p = binding.p ? replaceWithPrefixes(binding.p.value) : 'N/A';
                p = predicate == '?p' ? p : predicate;
                
                if (o in parentNodes) {
                    return;
                }

                if (!(subject in nodeMap)) {
                    
                    processedNodes[o] = true;
                        nodeMap[subject] = {id: subject, name: subject};
                        objectNodes.push(nodeMap[subject]);  
                }

                // Проверяем, является ли объект ссылкой
                if (!o.startsWith(linkPrefix)) {
                    // Если объект не является ссылкой, добавляем его к названию субъекта
                    nodeMap[subject].name += '\n' + p + ': ' + o + '';
                } else {
                    fullDepth++;
                    if (!(o in nodeMap)) {
                        nodeMap[o] = {id: o, name: o};
                        objectNodes.push(nodeMap[o]);   
                    }

                
                    if (depth > 0 && !(o in processedNodes)) {
                        parentNodes[subject] = true;
                        processedNodes[o] = true;
                        
                            sendSPARQLQuery(depth - 1, o, '?p');
                        }

                    if (!(p in predicateMap)) {
                        predicateMap[p] = {id: p, name: p};
                        predicateNodes.push(predicateMap[p]);
                    }

                    links.push({
                        source: nodeMap[subject],
                        target: predicateMap[p]
                    });

                    links.push({
                        source: predicateMap[p],
                        target: nodeMap[o]
                    });
                }
            });
        } else {
            console.error('Error:', xhr.status);
        }
    }

    window.onload = function() {
        parentNodes[startResource] = true;
        processedNodes[startResource] = true;
        sendSPARQLQuery(0, startResource);
        updateGraph();
        
    };