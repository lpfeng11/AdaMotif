import utils

def main():

    # graphName = 'test'
    graphName = 'Cpan'
    # graphName = 'AS-733'

    partition_obj = utils.community_partition(graphName)
    numberOfSubgraph = partition_obj.communityPartition()

    feathers_obj = utils.get_feature_subgraph(numberOfSubgraph, graphName)
    feathers = feathers_obj.getFeatures()

    cluster_obj = utils.get_subgraph_cluster(graphName, feathers)
    cluster_obj.getCluster()

    representive_subgraph_obj = utils.get_feature_representive_subgraph(numberOfSubgraph, graphName)
    representive_subgraph_istance_matrix = representive_subgraph_obj.getFeatures()

    representive_subgraph_cluster_obj = utils.get_representive_cluster(graphName, representive_subgraph_istance_matrix)
    representive_subgraph_cluster_obj.getCluster()

    simplified_position_obj = utils.get_simplified_init_position(graphName)
    simplified_position_obj.getSimplifiedPosition()

    print("Done")

if __name__ == "__main__":
    main()