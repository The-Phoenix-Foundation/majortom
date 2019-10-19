// function that creates link pointing to satelite mission metadata
function get_celestrak_url(internal_designator) {
    //internal designator id looks like 1964-063B
    //data example https://celestrak.com/satcat/1964/1964-063.php#C
    [year, sub_id] = internal_designator.split("-");
    return "https://celestrak.com/satcat/" + year + "/" + internal_designator.slice(0, -1) + ".php#" + internal_designator.slice(0, -1);
}