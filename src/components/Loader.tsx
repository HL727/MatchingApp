import React, {Component} from 'react';
import {StyleSheet, View, Modal, Image, ActivityIndicator} from 'react-native';

type MyProps = {isLoading: boolean};
type MyState = {isLoading: boolean};

class Loader extends Component<MyProps, MyState> {
  constructor(props: MyProps) {
    super(props);
    this.state = {
      isLoading: this.props.isLoading,
    };
  }

  static getDerivedStateFromProps(nextProps: any) {
    return {
      isLoading: nextProps.isLoading,
    };
  }

  render() {
    return (
      <Modal
        transparent={true}
        animationType={'none'}
        visible={this.state.isLoading}
        style={{zIndex: 1100}}
        onRequestClose={() => {}}
      >
        <View style={styles.modalBackground}>
          <View style={styles.activityIndicatorWrapper}>
            <ActivityIndicator
              animating={this.state.isLoading}
              color={'#fff'}
              size={60}
            />
            {/* If you want to image set source here */}
            {/* <Image
              source={require('../assets/images/loader.gif')}
              style={{ height: 80, width: 80 }}
              resizeMode="contain"
              resizeMethod="resize"
            /> */}
          </View>
        </View>
      </Modal>
    );
  }
}

const styles = StyleSheet.create({
  modalBackground: {
    flex: 1,
    alignItems: 'center',
    flexDirection: 'column',
    justifyContent: 'space-around',
    backgroundColor: 'transparent',
    zIndex: 1000,
  },
  activityIndicatorWrapper: {
    backgroundColor: '#rgba(0, 0, 0, 0.5)',
    height: 100,
    width: 100,
    borderRadius: 10,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
});

export default Loader;
