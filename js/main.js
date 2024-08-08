// const graph_name = 'test'
const graph_name = 'Cpan'  
// const graph_name = 'AS-733' 

const communityPartitionMethod = 'multilevel'

const cluster_method = 'AffinityPropagation'

let executed = false;
async function executeFunctionsInOrder() {
    const initialSliceId = "initial-graph"
    if (!executed){
        await simplified_graph(graph_name, communityPartitionMethod, cluster_method);
    }
    executed = true;
}


executeFunctionsInOrder();

