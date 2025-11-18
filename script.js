

async function loadData(){
	let data = await d3.csv("catData.csv", d3.autoType); 
	let columns = data.columns;
	console.log(columns)

	data = d3.filter(data, (v) => {
		return v.size <= 20 
	})
	console.log(data);

	data = d3.sort(data, (a, b) => {
		return d3.descending(a.size, b.size)
	})
	console.log(data);

	let mean = d3.mean(data, (d) => {
		return d.size; 
	});
	console.log(mean)

	let table = document.createElement("table")

	let header = "<tr>"
	columns.forEach((v) => {
		header += "<th>" + v + "</th>";
	})
	header += "</tr>";

	let rows = "";
	data.forEach((v) => {
		rows += "<tr>"

		rows += "<td>" + v.name + "</td>";
		rows += "<td>" + v.size + "</td>";
		rows += "<td>" + v["favorite food"] + "</td>";
		rows += "<td>" + v.owner + "</td>";

		rows += "</tr>"
	})
	console.log(rows)

	let tableHTML = header + rows
	table.innerHTML = tableHTML;

	let body = document.querySelector("body");
	body.appendChild(table)
}


window.onload = function() {
	loadData();
}
